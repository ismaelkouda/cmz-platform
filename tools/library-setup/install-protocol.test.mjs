import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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

import { materializeGitTree, readGitTree } from './git-tree.mjs';
import {
    resolveLibraryDependencies,
    verifyInstalledPackages,
} from './install-protocol.mjs';

const realRoot = new URL('../..', import.meta.url).pathname;

function git(root, ...args) {
    return execFileSync('git', ['-C', root, ...args], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
    });
}

async function put(root, path, content) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), content);
}

test('exécute base, génération et vérification neuve sans script de cycle de vie', async (t) => {
    const root = await realpath(
        await mkdtemp(join(tmpdir(), 'cmz-install-protocol-'))
    );
    t.after(() => rm(root, { recursive: true, force: true }));
    const repository = join(root, 'repo');
    await mkdir(repository);
    git(repository, 'init', '-q');
    git(repository, 'config', 'user.email', 'test@example.test');
    git(repository, 'config', 'user.name', 'Test');
    const manifest = {
        name: 'fixture',
        private: true,
        packageManager: 'bun@1.3.14',
        scripts: {
            preinstall: 'node tools/check-engines.mjs',
            prepare: 'husky',
        },
        dependencies: {},
        devDependencies: {},
        workspaces: { packages: [], catalog: {}, catalogs: { tooling: {} } },
    };
    const initialLock = {
        lockfileVersion: 1,
        configVersion: 1,
        workspaces: {
            '': { name: 'fixture', dependencies: {}, devDependencies: {} },
        },
        catalog: {},
        catalogs: { tooling: {} },
        packages: { base: ['base@1.0.0', '', {}, 'sha512-eA=='] },
    };
    await put(
        repository,
        'package.json',
        `${JSON.stringify(manifest, null, 2)}\n`
    );
    await put(
        repository,
        'bun.lock',
        `${JSON.stringify(initialLock, null, 2)}\n`
    );
    for (const path of [
        'conventions/libraries/resolution-policy.json',
        'conventions/libraries/resolution-policy.schema.json',
    ]) {
        await put(repository, path, await readFile(join(realRoot, path)));
    }
    await put(repository, 'tools/check-engines.mjs', 'process.exit(0);\n');
    git(repository, 'add', '.');
    git(repository, 'commit', '-qm', 'fixture');
    const tree = readGitTree(repository);
    const firstWorkspace = join(root, 'first');
    await mkdir(firstWorkspace);
    materializeGitTree(tree, firstWorkspace);
    const paths = {
        cache: join(root, 'cache'),
        homes: {
            base: join(root, 'home-base'),
            generation: join(root, 'home-generation'),
            verification: join(root, 'home-verification'),
            execution: join(root, 'home-execution'),
        },
    };
    await mkdir(paths.cache);
    for (const home of Object.values(paths.homes)) await mkdir(home);
    const track = {
        catalog: 'default',
        dependency_section: 'dependencies',
        packages: { material: '1.0.0' },
    };
    const calls = [];
    const run = (invocation) => {
        calls.push(invocation);
        if (invocation.argv[0] === '--version') {
            return { status: 0, signal: null, stdout: '1.3.14\n', stderr: '' };
        }
        if (
            invocation.argv[0] === 'install' &&
            !invocation.argv.includes('--frozen-lockfile')
        ) {
            const finalLock = structuredClone(initialLock);
            finalLock.workspaces[''].dependencies.material = 'catalog:';
            finalLock.catalog.material = '1.0.0';
            finalLock.packages.material = [
                'material@1.0.0',
                '',
                {},
                'sha512-eQ==',
            ];
            writeFileSync(
                join(invocation.candidate, 'bun.lock'),
                `${JSON.stringify(finalLock, null, 2)}\n`
            );
        }
        if (invocation.argv[0] === 'install') {
            const currentManifest = JSON.parse(
                readFileSync(join(invocation.candidate, 'package.json'), 'utf8')
            );
            if (currentManifest.dependencies?.material === 'catalog:') {
                const installed = join(
                    invocation.candidate,
                    'node_modules/material'
                );
                mkdirSync(installed, { recursive: true });
                writeFileSync(
                    join(installed, 'package.json'),
                    JSON.stringify({ name: 'material', version: '1.0.0' })
                );
            }
        }
        return { status: 0, signal: null, stdout: '', stderr: '' };
    };
    let verificationReleased = false;
    const createLease = () => {
        const workspace = join(root, 'verification');
        mkdirSync(workspace);
        materializeGitTree(tree, workspace);
        return { workspace, tree };
    };
    const result = await resolveLibraryDependencies({
        repository,
        candidate: { workspace: firstWorkspace, tree },
        track,
        policy: JSON.parse(
            await readFile(
                join(
                    repository,
                    'conventions/libraries/resolution-policy.json'
                ),
                'utf8'
            )
        ),
        backend: 'test',
        ...paths,
        bunExecutable: '/usr/local/bin/bun',
        createLease,
        releaseLease: () => {
            verificationReleased = true;
        },
        run,
    });
    assert.equal(result.bunVersion, '1.3.14');
    assert.equal(
        JSON.parse(result.packageJsonFinal).dependencies.material,
        'catalog:'
    );
    assert.equal(verificationReleased, true);
    assert.deepEqual(
        calls.map(({ argv }) => argv[0]),
        [
            'tools/check-engines.mjs',
            '--version',
            'install',
            'install',
            'install',
        ]
    );
    assert.equal(calls[0].profile, 'execution');
    assert.equal(calls[1].profile, 'resolution');
    assert.ok(calls.every(({ argv }) => !argv.includes('--trust')));
});

test('refuse un paquet direct absent, faux ou résolu hors du node_modules candidat', async (t) => {
    const root = await realpath(
        await mkdtemp(join(tmpdir(), 'cmz-installed-packages-'))
    );
    t.after(() => rm(root, { recursive: true, force: true }));
    const workspace = join(root, 'workspace');
    const nodeModules = join(workspace, 'node_modules');
    const outside = join(root, 'outside');
    await mkdir(nodeModules, { recursive: true });
    await mkdir(outside);
    const track = { packages: { material: '1.0.0' } };
    assert.throws(
        () => verifyInstalledPackages(workspace, track),
        /package.json installé introuvable/
    );
    await writeFile(
        join(outside, 'package.json'),
        JSON.stringify({ name: 'material', version: '1.0.0' })
    );
    await symlink(outside, join(nodeModules, 'material'));
    assert.throws(
        () => verifyInstalledPackages(workspace, track),
        /hors node_modules/
    );
    await rm(join(nodeModules, 'material'));
    await mkdir(join(nodeModules, 'material'));
    await writeFile(
        join(nodeModules, 'material/package.json'),
        JSON.stringify({ name: 'material', version: '9.9.9' })
    );
    assert.throws(
        () => verifyInstalledPackages(workspace, track),
        /9\.9\.9 au lieu de material@1\.0\.0/
    );
    await writeFile(
        join(nodeModules, 'material/package.json'),
        JSON.stringify({ name: 'material', version: '1.0.0' })
    );
    assert.doesNotThrow(() => verifyInstalledPackages(workspace, track));
});
