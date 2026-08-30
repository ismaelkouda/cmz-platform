import { spawnSync } from 'node:child_process';
import {
    access,
    chmod,
    copyFile,
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
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createRetirementPlan } from './retire-module-plan.mjs';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const MODULE = 'obsolete-feature';

async function write(path, content) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content);
}

async function exists(path) {
    try {
        await access(path);
        return true;
    } catch {
        return false;
    }
}

async function createWorkspace(t, { dependencyCheckExit = 0 } = {}) {
    const root = await mkdtemp(join(tmpdir(), 'cmz-retire-module-plan-'));
    t.after(() => rm(root, { recursive: true, force: true }));

    await mkdir(join(root, 'tools'), { recursive: true });
    for (const script of [
        'retire-module.mjs',
        'retire-module-plan.mjs',
        'retire-module-transaction.mjs',
        'retire-module-config.mjs',
        'retire-module-nx.mjs',
        'check-no-orphan-references.mjs',
        'check-removed-module-tombstones.mjs',
        'orphan-occurrence.mjs',
        'orphan-tombstone-update.mjs',
    ]) {
        await copyFile(
            join(REPO_ROOT, 'tools', script),
            join(root, 'tools', script)
        );
    }
    await write(
        join(root, '.gitignore'),
        '/.cmz/retire-module-transactions/\n/node_modules\n'
    );
    await symlink(
        join(REPO_ROOT, 'node_modules'),
        join(root, 'node_modules'),
        'dir'
    );
    const gitInit = spawnSync('git', ['init', '--quiet'], {
        cwd: root,
        encoding: 'utf8',
    });
    assert.equal(gitInit.status, 0, gitInit.stderr);
    await write(
        join(root, 'tools', 'check-project-names.mjs'),
        `console.log('names ok');\n`
    );
    await write(
        join(root, 'tools', 'check-declared-deps.mjs'),
        `console.log('deps check'); process.exit(${dependencyCheckExit});\n`
    );

    await write(
        join(root, 'package.json'),
        `${JSON.stringify({ name: '@test/workspace', private: true }, null, 2)}\n`
    );
    await write(join(root, 'bun.lock'), 'fixture-lock-v1\n');
    await write(
        join(root, 'tools', 'fake-nx-graph.mjs'),
        `import { execFileSync } from 'node:child_process';\nimport { existsSync, readFileSync } from 'node:fs';\nconst base = JSON.parse(process.env.CMZ_FAKE_NX_GRAPH);\nconst paths = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', 'apps', 'libs'], { encoding: 'utf8' }).split('\\0').filter((path) => path.endsWith('/project.json') && existsSync(path));\nconst names = paths.map((path) => JSON.parse(readFileSync(path, 'utf8')).name).sort();\nconst nodes = Object.fromEntries(names.map((name) => [name, base.graph.nodes[name] || { name }]));\nconst dependencies = Object.fromEntries(names.map((name) => [name, base.graph.dependencies[name] || []]));\nprocess.stdout.write(JSON.stringify({ graph: { nodes, dependencies } }));\n`
    );
    const fakeNxBin = join(root, 'fake-nx-bin');
    await write(
        join(fakeNxBin, 'bunx'),
        [
            '#!/bin/sh',
            'if [ "$1 $2 $3" = "nx graph --file=stdout" ]; then',
            '  node "$PWD/tools/fake-nx-graph.mjs"',
            '  exit 0',
            'fi',
            'if [ "$1 $2" = "nx affected" ]; then',
            '  exit "${CMZ_FAKE_NX_AFFECTED_EXIT:-0}"',
            'fi',
            'exit 64',
        ].join('\n') + '\n'
    );
    await chmod(join(fakeNxBin, 'bunx'), 0o755);
    const fakeBunBin = join(root, 'fake-bun-bin');
    await write(join(fakeBunBin, 'bun'), '#!/bin/sh\nexit 71\n');
    await chmod(join(fakeBunBin, 'bun'), 0o755);
    await write(
        join(root, 'eslint.config.mjs'),
        `export default [{ rules: { boundary: { depConstraints: [{ sourceTag: 'scope:${MODULE}', onlyDependOnLibsWithTags: ['scope:${MODULE}'] }] } } }];\n`
    );
    await write(
        join(root, 'tsconfig.base.json'),
        `${JSON.stringify({ compilerOptions: { paths: { [`@cmz/${MODULE}-domain`]: [`./libs/${MODULE}/domain/src/index.ts`] } } }, null, 2)}\n`
    );
    await write(join(root, 'knip.json'), `{}\n`);

    const moduleRoot = join(root, 'libs', MODULE, 'domain');
    await write(
        join(moduleRoot, 'project.json'),
        `${JSON.stringify(
            {
                name: `@cmz/${MODULE}-domain`,
                tags: [`scope:${MODULE}`, 'type:domain'],
            },
            null,
            2
        )}\n`
    );
    await write(
        join(moduleRoot, 'src', 'index.ts'),
        `export const obsoleteFeature = true;\n`
    );

    await write(
        join(root, 'docs', 'history.md'),
        `Le module ${MODULE} a été retiré après validation du POC.\n`
    );
    await write(
        join(root, 'tools', 'fixtures', 'active.json'),
        `${JSON.stringify({ id: MODULE })}\n`
    );

    return root;
}

function runRetire(root, args, env = {}) {
    const nxGraph = {
        graph: {
            nodes: {
                [`@cmz/${MODULE}-domain`]: { name: `@cmz/${MODULE}-domain` },
            },
            dependencies: { [`@cmz/${MODULE}-domain`]: [] },
        },
    };
    const customPath = Object.hasOwn(env, 'PATH');
    const runtimeEnv = {
        ...process.env,
        ...env,
        CMZ_FAKE_NX_GRAPH:
            env.CMZ_FAKE_NX_GRAPH ||
            env.CMZ_RETIRE_MODULE_TEST_NX_GRAPH ||
            JSON.stringify(nxGraph),
        PATH: customPath
            ? `${join(root, 'fake-nx-bin')}:${env.PATH}`
            : `${join(root, 'fake-nx-bin')}:${join(root, 'fake-bun-bin')}:${process.env.PATH || ''}`,
    };
    delete runtimeEnv.CMZ_RETIRE_MODULE_TEST_NX_GRAPH;
    delete runtimeEnv.CMZ_RETIRE_MODULE_TEST_SKIP_NX_GATES;
    delete runtimeEnv.CMZ_RETIRE_MODULE_TEST_STOP_BEFORE_FINALIZE;
    delete runtimeEnv.CMZ_RETIRE_MODULE_TEST_SIGKILL_AFTER_MOVE;
    return spawnSync(
        process.execPath,
        [join(root, 'tools', 'retire-module.mjs'), ...args],
        {
            cwd: root,
            encoding: 'utf8',
            env: runtimeEnv,
        }
    );
}

function assertAwaitingFinalize(result) {
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Preuve Bun obligatoire/);
}

function transactionDir(root) {
    return join(root, '.cmz', 'retire-module-transactions', MODULE);
}

test('refuse un consommateur JavaScript externe avant toute suppression', async (t) => {
    const root = await createWorkspace(t);
    await write(
        join(root, 'apps', 'shell', 'project.json'),
        `${JSON.stringify(
            { name: '@cmz/shell-app', tags: ['scope:app', 'type:app'] },
            null,
            2
        )}\n`
    );
    await write(
        join(root, 'apps', 'shell', 'src', 'main.js'),
        `import '@cmz/${MODULE}-domain';\n`
    );

    const result = runRetire(root, ['--module', MODULE]);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /référence\(s\) source entrante/);
    assert.equal(await exists(join(root, 'libs', MODULE)), true);
    assert.equal(
        await exists(join(root, '.cmz', 'retire-module-transactions', MODULE)),
        false
    );
});

test('refuse une arête entrante du graphe Nx même sans occurrence textuelle', async (t) => {
    const root = await createWorkspace(t);
    const target = `@cmz/${MODULE}-domain`;
    await write(
        join(root, 'apps/external/project.json'),
        `${JSON.stringify({ name: 'external-app', tags: ['scope:app'] })}\n`
    );
    const graph = {
        graph: {
            nodes: {
                [target]: { name: target },
                'external-app': { name: 'external-app' },
            },
            dependencies: {
                [target]: [],
                'external-app': [
                    { source: 'external-app', target, type: 'implicit' },
                ],
            },
        },
    };

    const result = runRetire(root, ['--module', MODULE], {
        CMZ_RETIRE_MODULE_TEST_NX_GRAPH: JSON.stringify(graph),
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /graphe Nx : external-app/);
    assert.equal(await exists(join(root, 'libs', MODULE)), true);
});

test('détecte un consommateur dans un dossier qui partage le préfixe du module', async (t) => {
    const root = await createWorkspace(t);
    await write(
        join(root, 'libs', `${MODULE}-consumer`, 'domain', 'project.json'),
        `${JSON.stringify(
            {
                name: '@cmz/feature-consumer-domain',
                tags: ['scope:feature-consumer', 'type:domain'],
            },
            null,
            2
        )}\n`
    );
    await write(
        join(root, 'libs', `${MODULE}-consumer`, 'domain', 'src', 'index.ts'),
        `import '@cmz/${MODULE}-domain';\n`
    );

    const result = runRetire(root, ['--module', MODULE]);

    assert.equal(result.status, 1);
    assert.match(result.stderr, new RegExp(`${MODULE}-consumer`));
    assert.equal(await exists(join(root, 'libs', MODULE)), true);
});

test('ne sélectionne jamais un module voisin par préfixe', async (t) => {
    const root = await createWorkspace(t);

    const result = runRetire(root, ['--module', 'obsolete', '--dry-run']);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /tag exact "scope:obsolete"/);
    assert.equal(await exists(join(root, 'libs', MODULE)), true);
    assert.equal(await exists(transactionDir(root)), false);
});

test('ignore uniquement les projets déjà supprimés et prouvés par Git', async (t) => {
    const root = await createWorkspace(t);
    const removedRoot = join(root, 'libs', 'previously-removed', 'domain');
    await write(
        join(removedRoot, 'project.json'),
        `${JSON.stringify({
            name: '@cmz/previously-removed-domain',
            tags: ['scope:previously-removed', 'type:domain'],
        })}\n`
    );
    const added = spawnSync('git', ['add', '.'], {
        cwd: root,
        encoding: 'utf8',
    });
    assert.equal(added.status, 0, added.stderr);
    await rm(join(root, 'libs', 'previously-removed'), {
        recursive: true,
    });

    const { plan } = createRetirementPlan(root, MODULE);
    assert.deepEqual(plan.roots, [`libs/${MODULE}`]);
    assert.equal(plan.projects.length, 1);
    const dryRun = runRetire(root, ['--module', MODULE, '--dry-run']);
    assert.equal(dryRun.status, 0, dryRun.stderr || dryRun.stdout);
});

test('résout la cible par tag Nx exact, indépendamment du nom de dossier', async (t) => {
    const root = await createWorkspace(t);
    await write(
        join(root, 'libs', 'physical-container', 'domain', 'project.json'),
        `${JSON.stringify(
            {
                name: '@cmz/catalog-domain',
                tags: ['scope:catalog', 'type:domain'],
            },
            null,
            2
        )}\n`
    );

    const result = runRetire(root, ['--module', 'catalog', '--dry-run'], {
        CMZ_RETIRE_MODULE_TEST_NX_GRAPH: JSON.stringify({
            graph: {
                nodes: {
                    '@cmz/catalog-domain': { name: '@cmz/catalog-domain' },
                },
                dependencies: { '@cmz/catalog-domain': [] },
            },
        }),
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /@cmz\/catalog-domain/);
    assert.match(result.stdout, /libs\/physical-container/);
    assert.doesNotMatch(result.stdout, / {4}- libs\/obsolete-feature\n/);
});

test('refuse un conteneur physique qui mélange plusieurs scopes Nx', async (t) => {
    const root = await createWorkspace(t);
    await write(
        join(root, 'libs', MODULE, 'foreign', 'project.json'),
        `${JSON.stringify(
            {
                name: '@cmz/foreign-domain',
                tags: ['scope:foreign', 'type:domain'],
            },
            null,
            2
        )}\n`
    );

    const result = runRetire(root, ['--module', MODULE]);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /Conteneur Nx ambigu/);
    assert.equal(await exists(join(root, 'libs', MODULE)), true);
    assert.equal(await exists(transactionDir(root)), false);
});

test('produit un plan et une empreinte déterministes', async (t) => {
    const root = await createWorkspace(t);

    const first = runRetire(root, ['--module', MODULE, '--dry-run']);
    const second = runRetire(root, ['--module', MODULE, '--dry-run']);

    assert.equal(first.status, 0, first.stderr || first.stdout);
    assert.equal(second.status, 0, second.stderr || second.stdout);
    const firstHash = first.stdout.match(/Plan Nx exact ([a-f0-9]{64})/)?.[1];
    const secondHash = second.stdout.match(/Plan Nx exact ([a-f0-9]{64})/)?.[1];
    assert.ok(firstHash);
    assert.equal(secondHash, firstHash);
});

test('refuse une reprise si le plan Nx journalisé a été altéré', async (t) => {
    const root = await createWorkspace(t);
    const first = runRetire(root, ['--module', MODULE]);
    assertAwaitingFinalize(first);

    const statePath = join(transactionDir(root), 'state.json');
    const state = JSON.parse(await readFile(statePath, 'utf8'));
    state.plan.scopeTag = 'scope:another-module';
    await write(statePath, `${JSON.stringify(state, null, 2)}\n`);

    const resumed = runRetire(root, ['--resume', '--module', MODULE]);

    assert.equal(resumed.status, 1);
    assert.match(resumed.stderr, /État de retrait invalide/);
    assert.equal(await exists(transactionDir(root)), true);
    assert.equal(await exists(join(root, 'libs', MODULE)), false);
});

test('refuse une identité de projet Nx dupliquée', async (t) => {
    const root = await createWorkspace(t);
    await write(
        join(root, 'libs', 'duplicate-container', 'domain', 'project.json'),
        `${JSON.stringify(
            {
                name: `@cmz/${MODULE}-domain`,
                tags: ['scope:duplicate', 'type:domain'],
            },
            null,
            2
        )}\n`
    );

    const result = runRetire(root, ['--module', MODULE, '--dry-run']);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /Nom de projet Nx dupliqué/);
    assert.equal(await exists(join(root, 'libs', MODULE)), true);
});

test('refuse des métadonnées Nx sans scope exact exploitable', async (t) => {
    const root = await createWorkspace(t);
    await write(
        join(root, 'libs', MODULE, 'domain', 'project.json'),
        `${JSON.stringify({ name: `@cmz/${MODULE}-domain` }, null, 2)}\n`
    );

    const result = runRetire(root, ['--module', MODULE, '--dry-run']);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /Métadonnées Nx non déterministes/);
    assert.equal(await exists(join(root, 'libs', MODULE)), true);
});
