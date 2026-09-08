import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { realpathSync, writeFileSync } from 'node:fs';
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
import { fileURLToPath } from 'node:url';

import {
    executeBoundedLlm,
    validateLlmProcessAdapter,
} from './llm-execution.mjs';

const ADAPTER_SCRIPT = realpathSync(
    fileURLToPath(new URL('./llm-adapter-fixture.mjs', import.meta.url))
);
let adapterCounter = 0;

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

function processAdapter(setup, config) {
    adapterCounter += 1;
    const configPath = join(setup.root, `adapter-${adapterCounter}.json`);
    writeFileSync(configPath, JSON.stringify(config));
    return {
        executable: realpathSync(process.execPath),
        argv: [ADAPTER_SCRIPT, configPath],
    };
}

test('refuse tout adaptateur in-process ou à commande ambiguë', () => {
    assert.throws(
        () => validateLlmProcessAdapter(async () => undefined),
        /processus à schéma fermé/
    );
    assert.throws(
        () =>
            validateLlmProcessAdapter({
                executable: 'node',
                argv: [],
            }),
        /doit être absolu/
    );
    assert.throws(
        () =>
            validateLlmProcessAdapter({
                executable: realpathSync(process.execPath),
                argv: ['bad\0argument'],
            }),
        /argv.*invalide/
    );
    assert.throws(
        () =>
            validateLlmProcessAdapter({
                executable: join(tmpdir(), 'adaptateur-absent-cmz'),
                argv: [],
            }),
        /inaccessible/
    );
});

test('refuse un adaptateur invalide avant de créer son journal', async (t) => {
    const setup = await fixture(t, ['one']);
    await assert.rejects(
        executeBoundedLlm({
            ...setup,
            app: 'demo',
            adapter: async () => undefined,
            verify: () => ({ ok: true, failures: [] }),
        }),
        /processus à schéma fermé/
    );
    await assert.rejects(
        readFile(join(setup.repository, '.cmz/library-llm-audit')),
        /ENOENT|EISDIR/
    );
});

test('deux itérations bornées progressent, sont journalisées et ne voient que l’allowlist', async (t) => {
    const setup = await fixture(t);
    const capturePath = join(setup.root, 'requests.jsonl');
    const result = await executeBoundedLlm({
        ...setup,
        app: 'demo',
        adapter: processAdapter(setup, {
            capture_path: capturePath,
            responses: [
                {
                    schema_version: '1.0.0',
                    mutations: [create('src/one.ts', 'ready-one\n')],
                },
                {
                    schema_version: '1.0.0',
                    mutations: [create('src/two.ts', 'ready-two\n')],
                },
            ],
        }),
        verify: () => ({ ok: true, failures: [] }),
    });
    const requests = (await readFile(capturePath, 'utf8'))
        .trim()
        .split('\n')
        .map(JSON.parse);
    assert.ok(!JSON.stringify(requests).includes(setup.root));
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
                    adapter: processAdapter(setup, {
                        response: attack.response,
                    }),
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
                adapter: processAdapter(setup, {
                    response: {
                        schema_version: '1.0.0',
                        mutations: [create('src/one.ts', 'x'.repeat(200))],
                    },
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
                adapter: processAdapter(setup, {
                    response: { schema_version: '1.0.0', mutations: [] },
                }),
                verify: () => ({ ok: true, failures: [] }),
            }),
            /contexte.*au-delà/
        );
    });

    await t.test('timeout de l’adaptateur', async (subtest) => {
        const setup = await fixture(subtest, ['one']);
        setup.recipe.install.iteration_timeout_ms = 25;
        const marker = join(setup.root, 'late-adapter-write');
        await assert.rejects(
            executeBoundedLlm({
                ...setup,
                app: 'demo',
                adapter: processAdapter(setup, {
                    delay_ms: 250,
                    marker_path: marker,
                    response: {
                        schema_version: '1.0.0',
                        mutations: [create('src/one.ts', 'ready-one')],
                    },
                }),
                verify: () => ({ ok: true, failures: [] }),
            }),
            /timeout après 25 ms.*journal/
        );
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 300));
        await assert.rejects(readFile(marker), /ENOENT/);
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

    await t.test('timeout tue aussi les descendants', async (subtest) => {
        if (process.platform === 'win32') {
            subtest.skip('groupe de processus POSIX requis');
            return;
        }
        const setup = await fixture(subtest, ['one']);
        setup.recipe.install.iteration_timeout_ms = 25;
        const marker = join(setup.root, 'late-descendant-write');
        await assert.rejects(
            executeBoundedLlm({
                ...setup,
                app: 'demo',
                adapter: processAdapter(setup, {
                    delay_ms: 500,
                    child_marker_path: marker,
                    response: {
                        schema_version: '1.0.0',
                        mutations: [create('src/one.ts', 'ready-one')],
                    },
                }),
                verify: () => ({ ok: true, failures: [] }),
            }),
            /timeout après 25 ms.*journal/
        );
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 350));
        await assert.rejects(readFile(marker), /ENOENT/);
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
                adapter: processAdapter(setup, {
                    response: {
                        schema_version: '1.0.0',
                        mutations: [
                            {
                                op: 'modify',
                                path: 'src/one.ts',
                                sha256_before: sha256('other'),
                                content_utf8: 'ready-one\n',
                            },
                        ],
                    },
                }),
                verify: () => ({ ok: true, failures: [] }),
            }),
            /précondition sha256 périmée/
        );
    });
});

test('borne et valide strictement le protocole du processus adaptateur', async (t) => {
    const cases = [
        {
            name: 'JSON avec clé dupliquée',
            config: {
                raw_stdout:
                    '{"schema_version":"1.0.0","schema_version":"1.0.0","mutations":[]}',
            },
            error: /clé dupliquée/,
        },
        {
            name: 'octets non UTF-8',
            config: { raw_stdout_hex: 'fffe' },
            error: /non UTF-8/,
        },
        {
            name: 'JSON invalide',
            config: { raw_stdout: '{' },
            error: /sortie JSON.*invalide/,
        },
        {
            name: 'code de sortie non nul',
            config: { stderr_bytes: 32, exit_code: 7 },
            error: /code 7.*stderr=32 octets sha256=[a-f0-9]{64}/,
        },
    ];
    for (const entry of cases) {
        await t.test(entry.name, async (subtest) => {
            const setup = await fixture(subtest, ['one']);
            await assert.rejects(
                executeBoundedLlm({
                    ...setup,
                    app: 'demo',
                    adapter: processAdapter(setup, entry.config),
                    verify: () => ({ ok: true, failures: [] }),
                }),
                entry.error
            );
        });
    }

    await t.test('stderr au-delà de la borne', async (subtest) => {
        const setup = await fixture(subtest, ['one']);
        await assert.rejects(
            executeBoundedLlm({
                ...setup,
                app: 'demo',
                adapter: processAdapter(setup, {
                    stderr_bytes: 65537,
                    response: {
                        schema_version: '1.0.0',
                        mutations: [create('src/one.ts', 'ready-one')],
                    },
                }),
                verify: () => ({ ok: true, failures: [] }),
            }),
            /stderr.*au-delà de 65536 octets/
        );
    });

    await t.test('environnement sans secret hérité', async (subtest) => {
        const setup = await fixture(subtest, ['one']);
        const capture = join(setup.root, 'adapter-env.json');
        const previous = process.env.CMZ_TEST_SECRET;
        process.env.CMZ_TEST_SECRET = 'ne-doit-pas-sortir';
        subtest.after(() => {
            if (previous === undefined) delete process.env.CMZ_TEST_SECRET;
            else process.env.CMZ_TEST_SECRET = previous;
        });
        await executeBoundedLlm({
            ...setup,
            app: 'demo',
            adapter: processAdapter(setup, {
                capture_env_path: capture,
                response: {
                    schema_version: '1.0.0',
                    mutations: [create('src/one.ts', 'ready-one')],
                },
            }),
            verify: () => ({ ok: true, failures: [] }),
        });
        const environment = JSON.parse(await readFile(capture, 'utf8'));
        assert.equal(environment.CMZ_TEST_SECRET, undefined);
        assert.equal(environment.PATH, undefined);
        assert.equal(environment.LANG, 'C.UTF-8');
        assert.equal(environment.LC_ALL, 'C.UTF-8');
        assert.deepEqual(
            Object.keys(environment)
                .filter((name) => !name.startsWith('__CF_'))
                .sort(),
            ['LANG', 'LC_ALL']
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
                adapter: processAdapter(setup, {
                    response: {
                        schema_version: '1.0.0',
                        mutations: [create('src/one.ts', 'ready-one')],
                    },
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
                adapter: processAdapter(setup, {
                    response: {
                        schema_version: '1.0.0',
                        mutations: [create('src/one.ts', 'ready-one')],
                    },
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
                adapter: processAdapter(setup, {
                    response: {
                        schema_version: '1.0.0',
                        mutations: [create('src/one.ts', 'ready-one')],
                    },
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
                    adapter: processAdapter(setup, {
                        response: {
                            schema_version: '1.0.0',
                            mutations: [
                                create('src/one.ts', 'ready-one'),
                                create('../outside', 'bad'),
                            ],
                        },
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
    const capturePath = join(setup.root, 'requests.jsonl');
    await assert.rejects(
        executeBoundedLlm({
            ...setup,
            app: 'demo',
            adapter: processAdapter(setup, {
                capture_path: capturePath,
                responses: ['one', 'two', 'three'].map((name) => ({
                    schema_version: '1.0.0',
                    mutations: [create(`src/${name}.ts`, `ready-${name}\n`)],
                })),
            }),
            verify: () => ({ ok: false, failures: ['oracle toujours rouge'] }),
        }),
        /3 itérations épuisées.*journal/
    );
    assert.equal(
        (await readFile(capturePath, 'utf8')).trim().split('\n').length,
        3
    );
    const auditRoot = join(setup.repository, '.cmz/library-llm-audit');
    const log = await readFile(
        join(auditRoot, `${setup.candidate.id}.jsonl`),
        'utf8'
    );
    assert.equal(log.trim().split('\n').length, 6);
});
