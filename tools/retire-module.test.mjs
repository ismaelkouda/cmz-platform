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
import { hostname, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { test } from 'node:test';

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
    const root = await mkdtemp(join(tmpdir(), 'cmz-retire-module-'));
    t.after(() => rm(root, { recursive: true, force: true }));

    await mkdir(join(root, 'tools'), { recursive: true });
    for (const script of [
        'retire-module.mjs',
        'retire-module-plan.mjs',
        'retire-module-transaction.mjs',
        'retire-module-config.mjs',
        'retire-module-nx.mjs',
        'check-no-orphan-references.mjs',
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
        `import { execFileSync } from 'node:child_process';\nimport { readFileSync } from 'node:fs';\nconst base = JSON.parse(process.env.CMZ_FAKE_NX_GRAPH);\nconst paths = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', 'apps', 'libs'], { encoding: 'utf8' }).split('\\0').filter((path) => path.endsWith('/project.json'));\nconst names = paths.map((path) => JSON.parse(readFileSync(path, 'utf8')).name).sort();\nconst nodes = Object.fromEntries(names.map((name) => [name, base.graph.nodes[name] || { name }]));\nconst dependencies = Object.fromEntries(names.map((name) => [name, base.graph.dependencies[name] || []]));\nprocess.stdout.write(JSON.stringify({ graph: { nodes, dependencies } }));\n`
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

function exactReference(root, file, line, reason) {
    const result = spawnSync(
        process.execPath,
        [
            join(root, 'tools', 'check-no-orphan-references.mjs'),
            '--module',
            MODULE,
        ],
        { cwd: root, encoding: 'utf8' }
    );
    const escapedFile = file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = result.stderr.match(
        new RegExp(
            `NON APPROUVÉE ${escapedFile}:${line}:\\d+[\\s\\S]*?` +
                `occurrence-sha256: ([a-f0-9]{64})`
        )
    );
    assert.ok(match, `Occurrence exacte introuvable pour ${file}:${line}`);
    return `${file}::${match[1]}::${reason}`;
}

function assertAwaitingFinalize(result) {
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Preuve Bun obligatoire/);
}

function transactionDir(root) {
    return join(root, '.cmz', 'retire-module-transactions', MODULE);
}

test('une commande combine retrait, classifications, bun install et finalisation', async (t) => {
    const root = await createWorkspace(t);
    const packageJson = JSON.parse(
        await readFile(join(root, 'package.json'), 'utf8')
    );
    packageJson.devDependencies = { [`@cmz/${MODULE}-domain`]: 'workspace:*' };
    await write(
        join(root, 'package.json'),
        `${JSON.stringify(packageJson, null, 2)}\n`
    );
    const binDir = join(root, 'fake-bin');
    const fakeBun = join(binDir, 'bun');
    await write(
        fakeBun,
        '#!/bin/sh\nprintf "%s\\n" "$*" >> "$PWD/bun-invocations"\n'
    );
    await chmod(fakeBun, 0o755);

    const result = runRetire(
        root,
        [
            '--module',
            MODULE,
            '--historical-reference',
            exactReference(
                root,
                'docs/history.md',
                1,
                'historique de retrait revu'
            ),
            '--active-reference',
            exactReference(
                root,
                'tools/fixtures/active.json',
                1,
                'fixture active du générateur'
            ),
        ],
        {
            PATH: `${binDir}:${process.env.PATH || ''}`,
            CMZ_RETIRE_MODULE_TEST_STOP_BEFORE_FINALIZE: '',
        }
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(await exists(join(root, 'libs', MODULE)), false);
    assert.match(result.stdout, /vérifié en mode frozen/);
    assert.deepEqual(
        (await readFile(join(root, 'bun-invocations'), 'utf8'))
            .trim()
            .split('\n'),
        ['install', 'install --frozen-lockfile']
    );
    assert.equal(
        await exists(join(root, '.cmz', 'retire-module-transactions', MODULE)),
        false
    );
    assert.doesNotMatch(
        await readFile(join(root, 'eslint.config.mjs'), 'utf8'),
        new RegExp(`scope:${MODULE}`)
    );
    const finalTsconfig = JSON.parse(
        await readFile(join(root, 'tsconfig.base.json'), 'utf8')
    );
    assert.equal(
        Object.hasOwn(
            finalTsconfig.compilerOptions.paths,
            `@cmz/${MODULE}-domain`
        ),
        false
    );
});

test('restaure les fichiers si un garde-fou post-suppression échoue', async (t) => {
    const root = await createWorkspace(t, { dependencyCheckExit: 1 });

    const result = runRetire(root, ['--module', MODULE]);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /restaurées automatiquement/);
    assert.equal(
        await exists(join(root, 'libs', MODULE, 'domain', 'src', 'index.ts')),
        true
    );
    assert.equal(
        await exists(join(root, '.cmz', 'retire-module-transactions', MODULE)),
        false
    );
});

test('rejette les classifications hors workspace', async (t) => {
    const root = await createWorkspace(t);

    const result = runRetire(root, [
        '--module',
        MODULE,
        '--historical-reference',
        `../outside.md::${'a'.repeat(64)}::raison`,
        '--dry-run',
    ]);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /hors workspace refusé/);
});

test('rejette tout bypass de la preuve Bun', async (t) => {
    const root = await createWorkspace(t);

    const result = runRetire(root, [
        '--finalize',
        '--module',
        MODULE,
        '--skip-install',
    ]);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /Argument inconnu : --skip-install/);
});

test('conserve la transaction si la vérification frozen échoue', async (t) => {
    const root = await createWorkspace(t);
    const first = runRetire(root, ['--module', MODULE]);
    assertAwaitingFinalize(first);

    const packageJson = JSON.parse(
        await readFile(join(root, 'package.json'), 'utf8')
    );
    packageJson.devDependencies = { example: '1.0.0' };
    await write(
        join(root, 'package.json'),
        `${JSON.stringify(packageJson, null, 2)}\n`
    );

    const binDir = join(root, 'fake-bin');
    const fakeBun = join(binDir, 'bun');
    await write(
        fakeBun,
        '#!/bin/sh\nif [ "$*" = "install --frozen-lockfile" ]; then exit 42; fi\n'
    );
    await chmod(fakeBun, 0o755);

    const second = runRetire(root, ['--finalize', '--module', MODULE], {
        PATH: `${binDir}:${process.env.PATH || ''}`,
    });

    assert.equal(second.status, 1);
    assert.match(second.stderr, /Preuve Bun obligatoire/);
    assert.equal(
        await exists(
            join(
                root,
                '.cmz',
                'retire-module-transactions',
                MODULE,
                'state.json'
            )
        ),
        true
    );
    assert.equal(
        await exists(
            join(
                root,
                '.cmz',
                'retire-module-transactions',
                MODULE,
                'removed',
                'libs',
                MODULE,
                'domain',
                'src',
                'index.ts'
            )
        ),
        true
    );
});

test('régénère puis vérifie le lockfile même si package.json est inchangé', async (t) => {
    const root = await createWorkspace(t);
    const first = runRetire(root, [
        '--module',
        MODULE,
        '--historical-reference',
        exactReference(
            root,
            'docs/history.md',
            1,
            'historique de retrait revu'
        ),
        '--active-reference',
        exactReference(
            root,
            'tools/fixtures/active.json',
            1,
            'fixture active du générateur'
        ),
    ]);
    assertAwaitingFinalize(first);

    const binDir = join(root, 'fake-bin');
    const fakeBun = join(binDir, 'bun');
    await write(
        fakeBun,
        '#!/bin/sh\nprintf "%s\\n" "$*" >> "$PWD/bun-invocations"\n'
    );
    await chmod(fakeBun, 0o755);

    const second = runRetire(root, ['--finalize', '--module', MODULE], {
        PATH: `${binDir}:${process.env.PATH || ''}`,
    });

    assert.equal(second.status, 0, second.stderr || second.stdout);
    assert.deepEqual(
        (await readFile(join(root, 'bun-invocations'), 'utf8'))
            .trim()
            .split('\n'),
        ['install', 'install --frozen-lockfile']
    );
});

test('abandonne une transaction en restaurant les racines', async (t) => {
    const root = await createWorkspace(t);
    const first = runRetire(root, ['--module', MODULE]);
    assertAwaitingFinalize(first);
    await write(join(root, 'bun.lock'), 'lock-régénéré-incomplet\n');
    await write(
        join(root, 'docs/architecture/removed-modules', `${MODULE}.json`),
        '{}\n'
    );

    const aborted = runRetire(root, ['--abort', '--module', MODULE]);

    assert.equal(aborted.status, 0, aborted.stderr || aborted.stdout);
    assert.equal(
        await exists(join(root, 'libs', MODULE, 'domain', 'src', 'index.ts')),
        true
    );
    assert.equal(await exists(transactionDir(root)), false);
    assert.equal(
        await readFile(join(root, 'bun.lock'), 'utf8'),
        'fixture-lock-v1\n'
    );
    assert.equal(
        await exists(
            join(root, 'docs/architecture/removed-modules', `${MODULE}.json`)
        ),
        false
    );
    assert.match(
        await readFile(join(root, 'eslint.config.mjs'), 'utf8'),
        new RegExp(`scope:${MODULE}`)
    );
});

test('reprend un vrai SIGKILL après déplacement et configuration journalisés', async (t) => {
    const root = await createWorkspace(t);
    const binDir = join(root, 'sigkill-bin');
    await write(join(binDir, 'bun'), '#!/bin/sh\nkill -9 "$PPID"\nexit 0\n');
    await chmod(join(binDir, 'bun'), 0o755);
    const first = runRetire(root, ['--module', MODULE], {
        PATH: `${binDir}:${process.env.PATH || ''}`,
    });
    assert.equal(first.signal, 'SIGKILL');

    const statePath = join(transactionDir(root), 'state.json');
    const state = JSON.parse(await readFile(statePath, 'utf8'));
    assert.equal(state.status, 'awaiting-finalize');
    assert.deepEqual(state.movedRoots, [`libs/${MODULE}`]);

    const resumed = runRetire(root, ['--resume', '--module', MODULE]);

    assert.equal(resumed.status, 0, resumed.stderr || resumed.stdout);
    assert.equal(
        JSON.parse(await readFile(statePath, 'utf8')).status,
        'awaiting-finalize'
    );
    assert.equal(await exists(join(root, 'libs', MODULE)), false);
    assert.doesNotMatch(
        await readFile(join(root, 'eslint.config.mjs'), 'utf8'),
        new RegExp(`scope:${MODULE}`)
    );
});

test('refuse un verrou vivant détenu par un autre processus', async (t) => {
    const root = await createWorkspace(t);
    await write(
        join(root, '.cmz', 'retire-module-transactions', '.lock', 'owner.json'),
        `${JSON.stringify({
            version: 1,
            pid: process.pid,
            hostname: hostname(),
            started_at: new Date().toISOString(),
            module: 'another-module',
            command: 'retire',
        })}\n`
    );

    const result = runRetire(root, ['--module', MODULE]);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /détient le verrou/);
    assert.equal(await exists(join(root, 'libs', MODULE)), true);
});

test('récupère automatiquement un verrou local mort', async (t) => {
    const root = await createWorkspace(t);
    await write(
        join(root, '.cmz', 'retire-module-transactions', '.lock', 'owner.json'),
        `${JSON.stringify({
            version: 1,
            pid: 999999,
            hostname: hostname(),
            started_at: new Date().toISOString(),
            module: 'another-module',
            command: 'retire',
        })}\n`
    );

    const result = runRetire(root, ['--module', MODULE]);

    assertAwaitingFinalize(result);
    assert.equal(await exists(join(root, 'libs', MODULE)), false);
});

test('refuse de restaurer une sauvegarde altérée', async (t) => {
    const root = await createWorkspace(t);
    const first = runRetire(root, ['--module', MODULE]);
    assertAwaitingFinalize(first);
    await write(
        join(
            transactionDir(root),
            'removed',
            'libs',
            MODULE,
            'domain',
            'src',
            'index.ts'
        ),
        'export const tampered = true;\n'
    );

    const aborted = runRetire(root, ['--abort', '--module', MODULE]);

    assert.equal(aborted.status, 1);
    assert.match(aborted.stderr, /ne correspond plus au journal/);
    assert.equal(await exists(transactionDir(root)), true);
    assert.equal(await exists(join(root, 'libs', MODULE)), false);
});

test('refuse une sauvegarde de configuration dont le hash ne correspond plus', async (t) => {
    const root = await createWorkspace(t);
    const first = runRetire(root, ['--module', MODULE]);
    assertAwaitingFinalize(first);

    const statePath = join(transactionDir(root), 'state.json');
    const state = JSON.parse(await readFile(statePath, 'utf8'));
    state.configOriginals['eslint.config.mjs'] = Buffer.from(
        'export default [];\n'
    ).toString('base64');
    await write(statePath, `${JSON.stringify(state, null, 2)}\n`);

    const aborted = runRetire(root, ['--abort', '--module', MODULE]);
    assert.equal(aborted.status, 1);
    assert.match(aborted.stderr, /État de retrait invalide/);
    assert.equal(await exists(transactionDir(root)), true);
});

test('refuse une reprise ambiguë avec source et sauvegarde simultanées', async (t) => {
    const root = await createWorkspace(t);
    const first = runRetire(root, ['--module', MODULE]);
    assertAwaitingFinalize(first);
    await write(
        join(root, 'libs', MODULE, 'domain', 'src', 'index.ts'),
        'export const recreated = true;\n'
    );

    const resumed = runRetire(root, ['--resume', '--module', MODULE]);

    assert.equal(resumed.status, 1);
    assert.match(resumed.stderr, /source et sauvegarde existent simultanément/);
    assert.equal(await exists(transactionDir(root)), true);
});
