import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { lstatSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { createPageRealizationOracle } from './core/page-realization-sandbox.mjs';

const policy = {
    sandbox: {
        macos_executable: '/usr/bin/sandbox-exec',
        container_images: {
            execution: `node@sha256:${'a'.repeat(64)}`,
        },
    },
};

async function fixture(t) {
    const repository = await mkdtemp(
        join(tmpdir(), 'cmz-page-oracle-repository-')
    );
    t.after(() => rm(repository, { recursive: true, force: true }));
    await mkdir(join(repository, 'node_modules/tool'), { recursive: true });
    await mkdir(join(repository, 'tools/generator-platform'), {
        recursive: true,
    });
    await writeFile(join(repository, '.gitignore'), '.env\nnode_modules/\n');
    await writeFile(join(repository, 'tracked.txt'), 'tracked\n');
    await writeFile(join(repository, 'untracked.txt'), 'untracked\n');
    await writeFile(join(repository, '.env'), 'TOKEN=must-not-copy\n');
    await writeFile(join(repository, 'node_modules/tool/index.js'), 'module\n');
    await writeFile(
        join(
            repository,
            'tools/generator-platform/page-realization-oracle-runner.mjs'
        ),
        'runner\n'
    );
    execFileSync('git', ['init', '-q'], { cwd: repository });
    execFileSync('git', ['add', '.gitignore', 'tracked.txt', 'tools'], {
        cwd: repository,
    });
    return repository;
}

test('le candidat ne contient que les fichiers gouvernés et protège ses dépendances', async (t) => {
    const repository = await fixture(t);
    let invocation;
    const oracle = createPageRealizationOracle(
        { workspaceRoot: repository, appName: 'demo-app' },
        {
            loadPolicy: () => ({ policy, errors: [] }),
            runConfined: (options) => {
                invocation = options;
                return { status: 0, signal: null, stdout: 'ok', stderr: '' };
            },
        }
    );
    t.after(() => oracle.dispose());

    assert.equal(
        await readFile(join(oracle.candidate, 'tracked.txt'), 'utf8'),
        'tracked\n'
    );
    assert.equal(
        await readFile(join(oracle.candidate, 'untracked.txt'), 'utf8'),
        'untracked\n'
    );
    await assert.rejects(readFile(join(oracle.candidate, '.env')), /ENOENT/);
    assert.equal(
        lstatSync(join(repository, 'node_modules/tool/index.js')).ino,
        lstatSync(join(oracle.candidate, 'node_modules/tool/index.js')).ino
    );

    assert.equal(oracle.run('test'), 'ok');
    assert.equal(invocation.readOnlyCandidatePaths, undefined);
    assert.deepEqual(invocation.repositoryReadOnlyMounts, [
        { source: 'node_modules', destination: 'node_modules' },
    ]);
    assert.deepEqual(invocation.writableCandidateMounts, [
        {
            source: '.cmz-oracle-runtime/vite-temp',
            destination: 'node_modules/.vite-temp',
        },
    ]);
    assert.equal(invocation.nxRoot, '.cmz-oracle-runtime');
    assert.deepEqual(invocation.extraEnv, undefined);
    assert.deepEqual(invocation.argv, [
        'tools/generator-platform/page-realization-oracle-runner.mjs',
        '--oracle',
        'test',
        '--app',
        'demo-app',
    ]);
    assert.throws(() => oracle.run('arbitrary-command'), /non autorisé/);
});

test('refuse de démarrer si la politique de confinement est invalide', async (t) => {
    const repository = await fixture(t);
    assert.throws(
        () =>
            createPageRealizationOracle(
                { workspaceRoot: repository, appName: 'demo-app' },
                {
                    loadPolicy: () => ({ policy, errors: ['image absente'] }),
                }
            ),
        /politique de confinement invalide/
    );
});
