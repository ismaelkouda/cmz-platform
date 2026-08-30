import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
    chmod,
    copyFile,
    cp,
    mkdir,
    mkdtemp,
    readFile,
    rm,
    symlink,
    writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const REPOSITORY = fileURLToPath(new URL('..', import.meta.url));
const MODULE = 'lifecycle-proof';
const CONFIG_FILES = [
    'eslint.config.mjs',
    'tsconfig.base.json',
    'knip.json',
    'package.json',
    'bun.lock',
];

async function write(path, content) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content);
}

async function exists(path) {
    try {
        await readFile(path);
        return true;
    } catch (error) {
        if (error.code === 'EISDIR') return true;
        if (error.code === 'ENOENT') return false;
        throw error;
    }
}

async function createWorkspace(
    t,
    {
        moduleName = MODULE,
        definitionRelativePath = 'tools/generator-platform/sources/newsletter-subscribe.definition.json',
    } = {}
) {
    const root = await mkdtemp(join(tmpdir(), 'cmz-module-lifecycle-'));
    const external = await mkdtemp(join(tmpdir(), 'cmz-module-definition-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    t.after(() => rm(external, { recursive: true, force: true }));

    await mkdir(join(root, 'tools'), { recursive: true });
    await mkdir(join(root, 'libs'), { recursive: true });
    for (const script of [
        'create-module.mjs',
        'retire-module.mjs',
        'retire-module-config.mjs',
        'retire-module-nx.mjs',
        'retire-module-plan.mjs',
        'retire-module-transaction.mjs',
        'check-no-orphan-references.mjs',
    ])
        await copyFile(
            join(REPOSITORY, 'tools', script),
            join(root, 'tools', script)
        );
    await cp(
        join(REPOSITORY, 'tools/generator-platform'),
        join(root, 'tools/generator-platform'),
        { recursive: true }
    );
    await symlink(
        join(REPOSITORY, 'node_modules'),
        join(root, 'node_modules'),
        'dir'
    );
    for (const file of CONFIG_FILES)
        await copyFile(join(REPOSITORY, file), join(root, file));
    await write(
        join(root, '.gitignore'),
        '/node_modules\n/.cmz/create-module-transactions/\n/.cmz/retire-module-transactions/\n'
    );
    for (const script of [
        'check-project-names.mjs',
        'check-project-targets.mjs',
        'check-declared-deps.mjs',
    ])
        await write(
            join(root, 'tools', script),
            `console.log('fixture gate ok');\n`
        );

    const initialized = spawnSync('git', ['init', '--quiet'], {
        cwd: root,
        encoding: 'utf8',
    });
    assert.equal(initialized.status, 0, initialized.stderr);

    const definition = JSON.parse(
        await readFile(join(REPOSITORY, definitionRelativePath), 'utf8')
    );
    definition.feature = {
        id: moduleName,
        name: 'Lifecycle proof',
        description: 'Disposable lifecycle proof.',
    };
    const definitionPath = join(external, 'definition.json');
    await write(definitionPath, `${JSON.stringify(definition, null, 2)}\n`);

    const bin = join(root, 'bin');
    await write(
        join(root, 'tools/fake-nx-graph.mjs'),
        `import { execFileSync } from 'node:child_process';\nimport { readFileSync } from 'node:fs';\nconst base = JSON.parse(process.env.CMZ_FAKE_NX_GRAPH);\nconst paths = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', 'apps', 'libs'], { encoding: 'utf8' }).split('\\0').filter((path) => path.endsWith('/project.json'));\nconst names = paths.map((path) => JSON.parse(readFileSync(path, 'utf8')).name).sort();\nconst nodes = Object.fromEntries(names.map((name) => [name, base.graph.nodes[name] || { name }]));\nconst dependencies = Object.fromEntries(names.map((name) => [name, base.graph.dependencies[name] || []]));\nprocess.stdout.write(JSON.stringify({ graph: { nodes, dependencies } }));\n`
    );
    await write(
        join(bin, 'bun'),
        [
            '#!/bin/sh',
            'if [ "$CMZ_FAKE_BUN_MODE" = "kill" ]; then kill -KILL "$PPID"; fi',
            'if [ "$CMZ_FAKE_BUN_MODE" = "fail" ]; then exit 42; fi',
            'exit 0',
        ].join('\n') + '\n'
    );
    await write(
        join(bin, 'bunx'),
        [
            '#!/bin/sh',
            'if [ "$1 $2 $3" = "nx graph --file=stdout" ]; then',
            '  node "$PWD/tools/fake-nx-graph.mjs"',
            '  exit 0',
            'fi',
            'if [ "$1 $2" = "nx run" ] || [ "$1 $2" = "nx run-many" ]; then',
            '  if [ "$CMZ_FAKE_NX_FAIL" = "true" ]; then exit 42; fi',
            '  exit 0',
            'fi',
            'exit 64',
        ].join('\n') + '\n'
    );
    await chmod(join(bin, 'bun'), 0o755);
    await chmod(join(bin, 'bunx'), 0o755);
    return { root, definitionPath, bin };
}

function execute(
    root,
    bin,
    script,
    args,
    extraEnv = {},
    { moduleName = MODULE, layers = ['application', 'data', 'domain'] } = {}
) {
    const names = layers.map((layer) => `@cmz/${moduleName}-${layer}`);
    const nodes = Object.fromEntries(names.map((name) => [name, { name }]));
    const dependencies = Object.fromEntries(names.map((name) => [name, []]));
    return spawnSync(process.execPath, [join(root, 'tools', script), ...args], {
        cwd: root,
        encoding: 'utf8',
        env: {
            ...process.env,
            PATH: `${bin}:${process.env.PATH || ''}`,
            CMZ_FAKE_NX_GRAPH: JSON.stringify({
                graph: { nodes, dependencies },
            }),
            ...extraEnv,
        },
    });
}

test('création puis retrait réels sont inverses sans altérer les project.json générés', async (t) => {
    const { root, definitionPath, bin } = await createWorkspace(t);
    const before = new Map(
        await Promise.all(
            CONFIG_FILES.map(async (file) => [
                file,
                await readFile(join(root, file)),
            ])
        )
    );

    const creation = execute(root, bin, 'create-module.mjs', [
        '--definition',
        definitionPath,
    ]);
    assert.equal(creation.status, 0, creation.stderr || creation.stdout);
    for (const layer of [
        'angular-domain',
        'angular-data',
        'angular-application',
    ])
        assert.equal(
            await exists(join(root, 'libs', MODULE, layer, 'project.json')),
            true,
            `${layer}/project.json doit rester intact après la création`
        );

    const retirement = execute(root, bin, 'retire-module.mjs', [
        '--module',
        MODULE,
    ]);
    assert.equal(retirement.status, 0, retirement.stderr || retirement.stdout);
    assert.equal(await exists(join(root, 'libs', MODULE)), false);
    assert.equal(
        await exists(join(root, '.cmz/create-module-transactions', MODULE)),
        false
    );
    assert.equal(
        await exists(join(root, '.cmz/retire-module-transactions', MODULE)),
        false
    );
    for (const file of CONFIG_FILES)
        assert.deepEqual(
            await readFile(join(root, file)),
            before.get(file),
            `${file} doit être restauré octet pour octet après le cycle`
        );
    const tombstone = JSON.parse(
        await readFile(
            join(root, 'docs/architecture/removed-modules', `${MODULE}.json`),
            'utf8'
        )
    );
    assert.deepEqual(tombstone.references, []);
});

test('un SIGKILL pendant Bun laisse une transaction reprenable sans bypass', async (t) => {
    const { root, definitionPath, bin } = await createWorkspace(t);
    const interrupted = execute(
        root,
        bin,
        'create-module.mjs',
        ['--definition', definitionPath],
        { CMZ_FAKE_BUN_MODE: 'kill' }
    );
    assert.equal(interrupted.signal, 'SIGKILL');
    assert.equal(
        JSON.parse(
            await readFile(
                join(
                    root,
                    '.cmz/create-module-transactions',
                    MODULE,
                    'state.json'
                ),
                'utf8'
            )
        ).status,
        'configured'
    );
    assert.equal(await exists(join(root, 'libs', MODULE)), true);
    const conflictingRetirement = execute(root, bin, 'retire-module.mjs', [
        '--module',
        MODULE,
    ]);
    assert.equal(conflictingRetirement.status, 1);
    assert.match(conflictingRetirement.stderr, /création .* encore en cours/);

    const resumed = execute(root, bin, 'create-module.mjs', [
        '--resume',
        '--module',
        MODULE,
    ]);
    assert.equal(resumed.status, 0, resumed.stderr || resumed.stdout);
    assert.equal(
        await exists(join(root, '.cmz/create-module-transactions', MODULE)),
        false
    );
    assert.equal(
        await exists(join(root, 'libs', MODULE, 'angular-domain/project.json')),
        true
    );
});

test('un gate Nx en échec restaure sortie, configurations et lockfile', async (t) => {
    const { root, definitionPath, bin } = await createWorkspace(t);
    const before = new Map(
        await Promise.all(
            CONFIG_FILES.map(async (file) => [
                file,
                await readFile(join(root, file)),
            ])
        )
    );
    const result = execute(
        root,
        bin,
        'create-module.mjs',
        ['--definition', definitionPath],
        { CMZ_FAKE_NX_FAIL: 'true' }
    );
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Workspace restauré automatiquement/);
    assert.equal(await exists(join(root, 'libs', MODULE)), false);
    assert.equal(
        await exists(join(root, '.cmz/create-module-transactions', MODULE)),
        false
    );
    for (const file of CONFIG_FILES)
        assert.deepEqual(await readFile(join(root, file)), before.get(file));
});

test('un tombstone interdit toute recréation implicite', async (t) => {
    const { root, definitionPath, bin } = await createWorkspace(t);
    await write(
        join(root, 'docs/architecture/removed-modules', `${MODULE}.json`),
        '{"version":1,"module":"lifecycle-proof","references":[]}\n'
    );
    const result = execute(root, bin, 'create-module.mjs', [
        '--definition',
        definitionPath,
    ]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /tombstone de retrait/);
    assert.equal(await exists(join(root, 'libs', MODULE)), false);
});

test('le dry-run de création ne crée ni sortie ni stockage transactionnel', async (t) => {
    const { root, definitionPath, bin } = await createWorkspace(t);
    const result = execute(root, bin, 'create-module.mjs', [
        '--definition',
        definitionPath,
        '--dry-run',
    ]);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(await exists(join(root, 'libs', MODULE)), false);
    assert.equal(await exists(join(root, '.cmz')), false);
});

/**
 * Périmètre restreint (2026-08-30) : preuve que le cycle de vie
 * create-module/retire-module n'est pas spécifique à `action-request` —
 * `list-query` (verbe "query"/List simple, tools/generator-platform/core/
 * list-query-authoring.mjs) est reconnu par la même table de dispatch
 * (COMPOSITION_KINDS, tools/create-module.mjs) et le même mécanisme de
 * retrait générique (tools/retire-module.mjs ne connaît aucun composition
 * kind — il ne fait que scanner le graphe Nx et le tag scope:<module>,
 * peu importe qui les a produits). Module dédié (2 couches domain/data,
 * pas 3) pour ne pas dépendre d'un `-application` que list-query n'émet
 * jamais.
 */
const QUERY_MODULE = 'lifecycle-proof-query';

test('création puis retrait réels sont inverses pour list-query (2 couches, pas 3)', async (t) => {
    const { root, definitionPath, bin } = await createWorkspace(t, {
        moduleName: QUERY_MODULE,
        definitionRelativePath:
            'tools/generator-platform/sources/cmz-client-landing-home.definition.json',
    });
    const before = new Map(
        await Promise.all(
            CONFIG_FILES.map(async (file) => [
                file,
                await readFile(join(root, file)),
            ])
        )
    );

    const creation = execute(
        root,
        bin,
        'create-module.mjs',
        ['--definition', definitionPath],
        {},
        { moduleName: QUERY_MODULE, layers: ['data', 'domain'] }
    );
    assert.equal(creation.status, 0, creation.stderr || creation.stdout);
    for (const layer of ['angular-domain', 'angular-data'])
        assert.equal(
            await exists(
                join(root, 'libs', QUERY_MODULE, layer, 'project.json')
            ),
            true,
            `${layer}/project.json doit rester intact après la création`
        );
    assert.equal(
        await exists(join(root, 'libs', QUERY_MODULE, 'angular-application')),
        false,
        'list-query ne doit jamais produire de couche application'
    );

    const retirement = execute(
        root,
        bin,
        'retire-module.mjs',
        ['--module', QUERY_MODULE],
        {},
        { moduleName: QUERY_MODULE, layers: ['data', 'domain'] }
    );
    assert.equal(retirement.status, 0, retirement.stderr || retirement.stdout);
    assert.equal(await exists(join(root, 'libs', QUERY_MODULE)), false);
    assert.equal(
        await exists(
            join(root, '.cmz/create-module-transactions', QUERY_MODULE)
        ),
        false
    );
    assert.equal(
        await exists(
            join(root, '.cmz/retire-module-transactions', QUERY_MODULE)
        ),
        false
    );
    for (const file of CONFIG_FILES)
        assert.deepEqual(
            await readFile(join(root, file)),
            before.get(file),
            `${file} doit être restauré octet pour octet après le cycle`
        );
    const tombstone = JSON.parse(
        await readFile(
            join(
                root,
                'docs/architecture/removed-modules',
                `${QUERY_MODULE}.json`
            ),
            'utf8'
        )
    );
    assert.deepEqual(tombstone.references, []);
});

test('refuse un definition.kind non reconnu avant toute écriture', async (t) => {
    const { root, definitionPath, bin } = await createWorkspace(t, {
        moduleName: QUERY_MODULE,
        definitionRelativePath:
            'tools/generator-platform/sources/cmz-client-landing-home.definition.json',
    });
    const definition = JSON.parse(await readFile(definitionPath, 'utf8'));
    definition.kind = 'unknown-future-kind';
    await write(definitionPath, `${JSON.stringify(definition, null, 2)}\n`);
    const result = execute(
        root,
        bin,
        'create-module.mjs',
        ['--definition', definitionPath],
        {},
        { moduleName: QUERY_MODULE, layers: ['data', 'domain'] }
    );
    assert.equal(result.status, 1);
    assert.match(result.stderr, /kind "unknown-future-kind" non reconnu/);
    assert.equal(await exists(join(root, 'libs', QUERY_MODULE)), false);
    assert.equal(await exists(join(root, '.cmz')), false);
});
