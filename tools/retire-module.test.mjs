import { spawnSync } from 'node:child_process';
import {
    access,
    chmod,
    copyFile,
    mkdir,
    mkdtemp,
    readFile,
    rm,
    writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
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
        'check-no-orphan-references.mjs',
    ]) {
        await copyFile(
            join(REPO_ROOT, 'tools', script),
            join(root, 'tools', script)
        );
    }
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
    await write(join(root, 'eslint.config.mjs'), `export default [];\n`);
    await write(join(root, 'tsconfig.base.json'), `{}\n`);
    await write(join(root, 'knip.json'), `{}\n`);

    const moduleRoot = join(root, 'libs', MODULE, 'domain');
    await write(
        join(moduleRoot, 'project.json'),
        `${JSON.stringify({ name: `@cmz/${MODULE}-domain` }, null, 2)}\n`
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
    return spawnSync(
        process.execPath,
        [join(root, 'tools', 'retire-module.mjs'), ...args],
        {
            cwd: root,
            encoding: 'utf8',
            env: { ...process.env, ...env },
        }
    );
}

test('conserve les exemptions et combine bun install avec la finalisation', async (t) => {
    const root = await createWorkspace(t);
    const first = runRetire(root, [
        '--module',
        MODULE,
        '--allow',
        'docs/history.md',
        '--allow-active-fixture',
        'tools/fixtures/active.json',
    ]);

    assert.equal(first.status, 0, first.stderr || first.stdout);
    assert.equal(await exists(join(root, 'libs', MODULE)), false);
    assert.equal(
        await exists(join(root, '.nx', 'retire-module', MODULE, 'state.json')),
        true
    );

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
    await write(fakeBun, '#!/bin/sh\ntouch "$PWD/bun-install-ran"\n');
    await chmod(fakeBun, 0o755);

    const second = runRetire(root, ['--finalize', '--module', MODULE], {
        PATH: `${binDir}:${process.env.PATH || ''}`,
    });

    assert.equal(second.status, 0, second.stderr || second.stdout);
    assert.match(second.stdout, /bun\.lock régénéré/);
    assert.equal(await exists(join(root, 'bun-install-ran')), true);
    assert.equal(
        await exists(join(root, '.nx', 'retire-module', MODULE)),
        false
    );
});

test('refuse un consommateur JavaScript externe avant toute suppression', async (t) => {
    const root = await createWorkspace(t);
    await write(
        join(root, 'apps', 'shell', 'project.json'),
        `${JSON.stringify({ name: '@cmz/shell-app' }, null, 2)}\n`
    );
    await write(
        join(root, 'apps', 'shell', 'src', 'main.js'),
        `import '@cmz/${MODULE}-domain';\n`
    );

    const result = runRetire(root, ['--module', MODULE]);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /consommateur\(s\) EXTERNE/);
    assert.equal(await exists(join(root, 'libs', MODULE)), true);
    assert.equal(
        await exists(join(root, '.nx', 'retire-module', MODULE)),
        false
    );
});

test('restaure les fichiers si un garde-fou post-suppression échoue', async (t) => {
    const root = await createWorkspace(t, { dependencyCheckExit: 1 });

    const result = runRetire(root, ['--module', MODULE]);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /restaurés automatiquement/);
    assert.equal(
        await exists(join(root, 'libs', MODULE, 'domain', 'src', 'index.ts')),
        true
    );
    assert.equal(
        await exists(join(root, '.nx', 'retire-module', MODULE)),
        false
    );
});

test('rejette les exemptions hors workspace', async (t) => {
    const root = await createWorkspace(t);

    const result = runRetire(root, [
        '--module',
        MODULE,
        '--allow',
        '../outside.md',
        '--dry-run',
    ]);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /hors workspace refusé/);
});
