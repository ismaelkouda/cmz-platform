import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
    access,
    chmod,
    copyFile,
    mkdir,
    mkdtemp,
    rm,
    symlink,
    writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
export const MODULE = 'obsolete-feature';

export async function write(path, content) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content);
}

export async function exists(path) {
    try {
        await access(path);
        return true;
    } catch {
        return false;
    }
}

export async function createWorkspace(t, { dependencyCheckExit = 0 } = {}) {
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
    ])
        await copyFile(
            join(REPO_ROOT, 'tools', script),
            join(root, 'tools', script)
        );
    await write(
        join(root, '.gitignore'),
        '/.cmz/retire-module-transactions/\n/node_modules\n'
    );
    await symlink(
        join(REPO_ROOT, 'node_modules'),
        join(root, 'node_modules'),
        'dir'
    );
    const initialized = spawnSync('git', ['init', '--quiet'], {
        cwd: root,
        encoding: 'utf8',
    });
    assert.equal(initialized.status, 0, initialized.stderr);
    await write(
        join(root, 'tools/check-project-names.mjs'),
        `console.log('names ok');\n`
    );
    await write(
        join(root, 'tools/check-declared-deps.mjs'),
        `console.log('deps check'); process.exit(${dependencyCheckExit});\n`
    );
    await write(
        join(root, 'package.json'),
        `${JSON.stringify({ name: '@test/workspace', private: true }, null, 2)}\n`
    );
    await write(join(root, 'bun.lock'), 'fixture-lock-v1\n');
    await write(
        join(root, 'tools/fake-nx-graph.mjs'),
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
    await write(join(root, 'knip.json'), '{}\n');
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
        join(moduleRoot, 'src/index.ts'),
        'export const obsoleteFeature = true;\n'
    );
    await write(
        join(root, 'docs/history.md'),
        `Le module ${MODULE} a été retiré après validation du POC.\n`
    );
    await write(
        join(root, 'tools/fixtures/active.json'),
        `${JSON.stringify({ id: MODULE })}\n`
    );
    return root;
}

export function runRetire(root, args, env = {}) {
    const name = `@cmz/${MODULE}-domain`;
    const nxGraph = {
        graph: {
            nodes: { [name]: { name } },
            dependencies: { [name]: [] },
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
    for (const key of [
        'CMZ_RETIRE_MODULE_TEST_NX_GRAPH',
        'CMZ_RETIRE_MODULE_TEST_SKIP_NX_GATES',
        'CMZ_RETIRE_MODULE_TEST_STOP_BEFORE_FINALIZE',
        'CMZ_RETIRE_MODULE_TEST_SIGKILL_AFTER_MOVE',
    ])
        delete runtimeEnv[key];
    return spawnSync(
        process.execPath,
        [join(root, 'tools/retire-module.mjs'), ...args],
        { cwd: root, encoding: 'utf8', env: runtimeEnv }
    );
}

export function exactReference(root, file, line, reason) {
    const result = spawnSync(
        process.execPath,
        [
            join(root, 'tools/check-no-orphan-references.mjs'),
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

export function assertAwaitingFinalize(result) {
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Preuve Bun obligatoire/);
}

export function transactionDir(root) {
    return join(root, '.cmz', 'retire-module-transactions', MODULE);
}
