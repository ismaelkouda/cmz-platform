import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import {
    mkdir,
    mkdtemp,
    readFile,
    realpath,
    rm,
    symlink,
    writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';

import { executeBoundedLlm } from './llm-execution.mjs';

function sha256(value) {
    return createHash('sha256').update(value).digest('hex');
}

async function put(root, path, content) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), content);
}

async function fixture(t, invariants = ['one', 'two']) {
    const root = await realpath(
        await mkdtemp(join(tmpdir(), 'cmz-bounded-llm-'))
    );
    t.after(() => rm(root, { recursive: true, force: true }));
    const repository = join(root, 'repository');
    const workspace = join(root, 'candidate', 'workspace');
    await mkdir(join(repository, '.cmz'), { recursive: true });
    await mkdir(join(workspace, 'apps/demo/src'), { recursive: true });
    return {
        root,
        repository,
        candidate: { id: '0123456789abcdef0123456789abcdef', workspace },
        recipe: {
            library: 'demo-library',
            platform: 'angular',
            install: {
                method: 'llm-then-verified',
                prompt_contract: 'Produis seulement les fichiers demandés.',
                llm_write_paths: invariants.map((name) => `src/${name}.ts`),
                max_iterations: 3,
                iteration_timeout_ms: 120000,
                max_context_bytes: 262144,
                max_response_bytes: 65536,
            },
            static_invariants: invariants.map((name, index) => ({
                id: `invariant-${index + 1}`,
                assert: {
                    file: `src/${name}.ts`,
                    kind: 'file-contains',
                    value: `ready-${name}`,
                },
            })),
        },
    };
}

function create(path, content) {
    return { op: 'create', path, content_utf8: content };
}

test('deux itérations bornées progressent, sont journalisées et ne voient que l’allowlist', async (t) => {
    const setup = await fixture(t);
    const requests = [];
    const result = await executeBoundedLlm({
        ...setup,
        app: 'demo',
        adapter: async (request) => {
            requests.push(request);
            assert.ok(!JSON.stringify(request).includes(setup.root));
            return {
                schema_version: '1.0.0',
                mutations: [
                    request.iteration === 1
                        ? create('src/one.ts', 'ready-one\n')
                        : create('src/two.ts', 'ready-two\n'),
                ],
            };
        },
        verify: () => ({ ok: true, failures: [] }),
    });
    assert.equal(requests.length, 2);
    assert.deepEqual(requests[0].allowed_paths, ['src/one.ts', 'src/two.ts']);
    assert.equal(
        await readFile(
            join(setup.candidate.workspace, 'apps/demo/src/two.ts'),
            'utf8'
        ),
        'ready-two\n'
    );
    assert.ok(!result.auditPath.startsWith(setup.candidate.workspace));
    assert.match(result.auditSha256, /^[a-f0-9]{64}$/);
    const records = (await readFile(result.auditPath, 'utf8'))
        .trim()
        .split('\n')
        .map(JSON.parse);
    assert.equal(records.length, 4);
    assert.deepEqual(
        records.map(({ event }) => event),
        ['request', 'result', 'request', 'result']
    );
    assert.deepEqual(
        result.changeSet.changes.map(({ path }) => path),
        ['apps/demo/src/one.ts', 'apps/demo/src/two.ts']
    );
});

test('refuse schéma ouvert, suppression, chemin non autorisé, dépassement et précondition périmée', async (t) => {
    const attacks = [
        {
            name: 'champ shell',
            response: {
                schema_version: '1.0.0',
                mutations: [create('src/one.ts', 'ready-one')],
                command: 'curl evil',
            },
            error: /réponse hors schéma fermé/,
        },
        {
            name: 'suppression',
            response: {
                schema_version: '1.0.0',
                mutations: [
                    { op: 'delete', path: 'src/one.ts', content_utf8: '' },
                ],
            },
            error: /destructive ou hors allowlist/,
        },
        {
            name: 'traversée',
            response: {
                schema_version: '1.0.0',
                mutations: [create('../secret', 'x')],
            },
            error: /hors allowlist/,
        },
    ];
    for (const attack of attacks) {
        await t.test(attack.name, async (subtest) => {
            const setup = await fixture(subtest);
            await assert.rejects(
                executeBoundedLlm({
                    ...setup,
                    app: 'demo',
                    adapter: async () => attack.response,
                    verify: () => ({ ok: true, failures: [] }),
                }),
                attack.error
            );
        });
    }

    await t.test('réponse trop grande', async (subtest) => {
        const setup = await fixture(subtest);
        setup.recipe.install.max_response_bytes = 100;
        await assert.rejects(
            executeBoundedLlm({
                ...setup,
                app: 'demo',
                adapter: async () => ({
                    schema_version: '1.0.0',
                    mutations: [create('src/one.ts', 'x'.repeat(200))],
                }),
                verify: () => ({ ok: true, failures: [] }),
            }),
            /au-delà/
        );
    });

    await t.test('contexte trop grand', async (subtest) => {
        const setup = await fixture(subtest, ['one']);
        setup.recipe.install.max_context_bytes = 100;
        await put(
            setup.candidate.workspace,
            'apps/demo/src/one.ts',
            'x'.repeat(200)
        );
        await assert.rejects(
            executeBoundedLlm({
                ...setup,
                app: 'demo',
                adapter: async () => ({
                    schema_version: '1.0.0',
                    mutations: [],
                }),
                verify: () => ({ ok: true, failures: [] }),
            }),
            /contexte.*au-delà/
        );
    });

    await t.test('timeout de l’adaptateur', async (subtest) => {
        const setup = await fixture(subtest, ['one']);
        setup.recipe.install.iteration_timeout_ms = 10;
        await assert.rejects(
            executeBoundedLlm({
                ...setup,
                app: 'demo',
                adapter: async () => new Promise(() => undefined),
                verify: () => ({ ok: true, failures: [] }),
            }),
            /timeout après 10 ms.*journal/
        );
        const log = await readFile(
            join(
                setup.repository,
                '.cmz/library-llm-audit',
                `${setup.candidate.id}.jsonl`
            ),
            'utf8'
        );
        assert.deepEqual(
            log
                .trim()
                .split('\n')
                .map((line) => JSON.parse(line).event),
            ['request', 'adapter-error']
        );
    });

    await t.test('sha périmé', async (subtest) => {
        const setup = await fixture(subtest, ['one']);
        await put(
            setup.candidate.workspace,
            'apps/demo/src/one.ts',
            'not-ready\n'
        );
        await assert.rejects(
            executeBoundedLlm({
                ...setup,
                app: 'demo',
                adapter: async () => ({
                    schema_version: '1.0.0',
                    mutations: [
                        {
                            op: 'modify',
                            path: 'src/one.ts',
                            sha256_before: sha256('other'),
                            content_utf8: 'ready-one\n',
                        },
                    ],
                }),
                verify: () => ({ ok: true, failures: [] }),
            }),
            /précondition sha256 périmée/
        );
    });
});

test('refuse les liens symboliques et toute mutation du vérificateur', async (t) => {
    await t.test('cible symbolique', async (subtest) => {
        const setup = await fixture(subtest, ['one']);
        await put(setup.root, 'outside', 'secret');
        await symlink(
            join(setup.root, 'outside'),
            join(setup.candidate.workspace, 'apps/demo/src/one.ts')
        );
        await assert.rejects(
            executeBoundedLlm({
                ...setup,
                app: 'demo',
                adapter: async () => ({
                    schema_version: '1.0.0',
                    mutations: [create('src/one.ts', 'ready-one')],
                }),
                verify: () => ({ ok: true, failures: [] }),
            }),
            /(?:lien symbolique|cible de lien absolue)/
        );
    });

    await t.test('vérificateur mutateur', async (subtest) => {
        const setup = await fixture(subtest, ['one']);
        await assert.rejects(
            executeBoundedLlm({
                ...setup,
                app: 'demo',
                adapter: async () => ({
                    schema_version: '1.0.0',
                    mutations: [create('src/one.ts', 'ready-one')],
                }),
                verify: () => {
                    writeFileSync(
                        join(
                            setup.candidate.workspace,
                            'apps/demo/src/drift.ts'
                        ),
                        'drift'
                    );
                    return { ok: true, failures: [] };
                },
            }),
            /vérificateur a muté/
        );
    });

    await t.test('racine de journal symbolique', async (subtest) => {
        const setup = await fixture(subtest, ['one']);
        const outside = join(setup.root, 'audit-outside');
        await mkdir(outside);
        await symlink(
            outside,
            join(setup.repository, '.cmz/library-llm-audit')
        );
        await assert.rejects(
            executeBoundedLlm({
                ...setup,
                app: 'demo',
                adapter: async () => ({
                    schema_version: '1.0.0',
                    mutations: [create('src/one.ts', 'ready-one')],
                }),
                verify: () => ({ ok: true, failures: [] }),
            }),
            /journal LLM non canonique/
        );
    });

    await t.test(
        'réponse validée entièrement avant la première écriture',
        async (subtest) => {
            const setup = await fixture(subtest, ['one', 'two']);
            await assert.rejects(
                executeBoundedLlm({
                    ...setup,
                    app: 'demo',
                    adapter: async () => ({
                        schema_version: '1.0.0',
                        mutations: [
                            create('src/one.ts', 'ready-one'),
                            create('../outside', 'bad'),
                        ],
                    }),
                    verify: () => ({ ok: true, failures: [] }),
                }),
                /hors allowlist/
            );
            await assert.rejects(
                readFile(
                    join(setup.candidate.workspace, 'apps/demo/src/one.ts'),
                    'utf8'
                ),
                /ENOENT/
            );
        }
    );
});

test('trois itérations maximum puis échec dur avec journal conservé', async (t) => {
    const setup = await fixture(t, ['one', 'two', 'three']);
    let calls = 0;
    await assert.rejects(
        executeBoundedLlm({
            ...setup,
            app: 'demo',
            adapter: async (request) => {
                calls += 1;
                const name = ['one', 'two', 'three'][request.iteration - 1];
                return {
                    schema_version: '1.0.0',
                    mutations: [create(`src/${name}.ts`, `ready-${name}\n`)],
                };
            },
            verify: () => ({ ok: false, failures: ['oracle toujours rouge'] }),
        }),
        /3 itérations épuisées.*journal/
    );
    assert.equal(calls, 3);
    const auditRoot = join(setup.repository, '.cmz/library-llm-audit');
    const log = await readFile(
        join(auditRoot, `${setup.candidate.id}.jsonl`),
        'utf8'
    );
    assert.equal(log.trim().split('\n').length, 6);
});
