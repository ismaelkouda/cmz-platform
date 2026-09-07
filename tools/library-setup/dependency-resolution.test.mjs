import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
    applyDependencyOverlay,
    bunInstallArgv,
    updateRootManifest,
    validateLockEvolution,
} from './dependency-resolution.mjs';
import { materializeGitTree, readGitTree } from './git-tree.mjs';

const track = {
    catalog: 'default',
    dependency_section: 'dependencies',
    packages: { '@angular/material': '22.0.5', '@angular/cdk': '22.0.5' },
};

function git(root, ...args) {
    return execFileSync('git', ['-C', root, ...args], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
    });
}

async function init(root, files) {
    await mkdir(root);
    git(root, 'init', '-q');
    git(root, 'config', 'user.email', 'test@example.test');
    git(root, 'config', 'user.name', 'Test');
    for (const [path, content] of Object.entries(files)) {
        await writeFile(join(root, path), content);
    }
    git(root, 'add', '.');
    git(root, 'commit', '-qm', 'fixture');
}

test('mutation ciblée ajoute catalog et dépendances sans écraser une version existante', () => {
    const source = `${JSON.stringify({ dependencies: {}, devDependencies: {}, workspaces: { catalog: {}, catalogs: { tooling: {} } } }, null, 2)}\n`;
    const updated = updateRootManifest(source, track);
    const parsed = JSON.parse(updated);
    assert.equal(parsed.dependencies['@angular/material'], 'catalog:');
    assert.equal(parsed.workspaces.catalog['@angular/material'], '22.0.5');
    assert.throws(
        () => updateRootManifest(updated.replace('22.0.5', '21.0.0'), track),
        /mise à niveau globale implicite interdite/
    );
    assert.equal(updateRootManifest(updated, track), updated);
});

test('argv Bun impose scripts coupés, copies indépendantes, registre et gel', () => {
    assert.deepEqual(
        bunInstallArgv({
            frozen: true,
            registry: 'https://registry.npmjs.org',
        }),
        [
            'install',
            '--frozen-lockfile',
            '--ignore-scripts',
            '--backend=copyfile',
            '--registry=https://registry.npmjs.org',
        ]
    );
    assert.throws(
        () => bunInstallArgv({ frozen: false, registry: 'http://evil' }),
        /HTTPS/
    );
});

test('lockfile : conserve chaque record existant et n’accepte que la fermeture demandée', () => {
    const initial = JSON.stringify({
        workspaces: { '': { dependencies: {} } },
        catalog: {},
        packages: { base: ['base@1.0.0', '', {}, 'sha512-x'] },
    });
    const final = JSON.stringify({
        workspaces: {
            '': { dependencies: { '@angular/material': 'catalog:' } },
        },
        catalog: { '@angular/material': '22.0.5' },
        packages: {
            base: ['base@1.0.0', '', {}, 'sha512-x'],
            '@angular/material': [
                '@angular/material@22.0.5',
                '',
                { dependencies: { dep: '1.0.0' } },
                'sha512-y',
            ],
            dep: ['dep@1.0.0', '', {}, 'sha512-z'],
        },
    });
    const materialTrack = {
        catalog: 'default',
        dependency_section: 'dependencies',
        packages: { '@angular/material': '22.0.5' },
    };
    const result = validateLockEvolution(initial, final, materialTrack);
    assert.deepEqual(result.added, ['@angular/material', 'dep']);
    assert.throws(
        () =>
            validateLockEvolution(
                initial,
                final.replace('base@1.0.0', 'base@2.0.0'),
                materialTrack
            ),
        /préexistant modifié/
    );
    const unrelated = JSON.stringify({
        ...JSON.parse(final),
        packages: {
            ...JSON.parse(final).packages,
            surprise: ['surprise@1.0.0', '', {}, 'sha512-q'],
        },
    });
    assert.throws(
        () => validateLockEvolution(initial, unrelated, materialTrack),
        /hors fermeture : surprise/
    );
    assert.throws(
        () =>
            validateLockEvolution(
                initial,
                JSON.stringify({
                    ...JSON.parse(final),
                    overrides: { x: '1.0.0' },
                }),
                materialTrack
            ),
        /métadonnées du lockfile/
    );
});

test('le contrôle consomme le vrai bun.lock JSONC du dépôt', async () => {
    const repositoryRoot = fileURLToPath(new URL('../..', import.meta.url));
    const lock = await readFile(join(repositoryRoot, 'bun.lock'), 'utf8');
    const result = validateLockEvolution(lock, lock, {
        catalog: 'default',
        dependency_section: 'dependencies',
        packages: {},
    });
    assert.deepEqual(result.added, []);
});

test('lockfile : résout une dépendance dans le contexte Bun de son ancêtre exact', () => {
    const initial = JSON.stringify({
        workspaces: { '': { dependencies: {} } },
        catalog: {},
        packages: {
            '@emnapi/wasi-threads': [
                '@emnapi/wasi-threads@1.0.4',
                '',
                {},
                'sha512-old',
            ],
            'unrelated/@emnapi/wasi-threads': [
                '@emnapi/wasi-threads@1.2.2',
                '',
                {},
                'sha512-unrelated',
            ],
        },
    });
    const final = JSON.stringify({
        workspaces: {
            '': {
                dependencies: { '@tailwindcss/oxide-wasm32-wasi': 'catalog:' },
            },
        },
        catalog: { '@tailwindcss/oxide-wasm32-wasi': '4.1.13' },
        packages: {
            ...JSON.parse(initial).packages,
            '@tailwindcss/oxide-wasm32-wasi': [
                '@tailwindcss/oxide-wasm32-wasi@4.1.13',
                '',
                { dependencies: { '@emnapi/core': '^1.4.5' } },
                'sha512-root',
            ],
            '@tailwindcss/oxide-wasm32-wasi/@emnapi/core': [
                '@emnapi/core@1.11.2',
                '',
                { dependencies: { '@emnapi/wasi-threads': '1.2.2' } },
                'sha512-core',
            ],
            '@tailwindcss/oxide-wasm32-wasi/@emnapi/wasi-threads': [
                '@emnapi/wasi-threads@1.2.2',
                '',
                {},
                'sha512-contextual',
            ],
        },
    });
    const result = validateLockEvolution(initial, final, {
        catalog: 'default',
        dependency_section: 'dependencies',
        packages: { '@tailwindcss/oxide-wasm32-wasi': '4.1.13' },
    });
    assert.deepEqual(result.added, [
        '@tailwindcss/oxide-wasm32-wasi',
        '@tailwindcss/oxide-wasm32-wasi/@emnapi/core',
        '@tailwindcss/oxide-wasm32-wasi/@emnapi/wasi-threads',
    ]);
    assert.ok(
        result.reachable.includes(
            '@tailwindcss/oxide-wasm32-wasi/@emnapi/wasi-threads'
        )
    );
    assert.ok(!result.reachable.includes('unrelated/@emnapi/wasi-threads'));
});

test('overlay clos remplace uniquement package.json et bun.lock puis revérifie le tree', async (t) => {
    const root = await mkdtemp(join(tmpdir(), 'cmz-overlay-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    const repo = join(root, 'repo');
    const workspace = join(root, 'workspace');
    await mkdir(workspace);
    await init(repo, {
        'package.json': '{}\n',
        'bun.lock': '{"packages":{}}\n',
        keep: 'same',
    });
    const tree = readGitTree(repo);
    materializeGitTree(tree, workspace);
    const manifest = '{"name":"final"}\n';
    const lock = '{"packages":{"x":["x@1.0.0"]}}\n';
    const inventory = applyDependencyOverlay(tree, workspace, {
        'package.json': manifest,
        'bun.lock': lock,
    });
    assert.deepEqual(
        inventory.map(({ path }) => path),
        ['package.json', 'bun.lock']
    );
    assert.equal(
        await readFile(join(workspace, 'package.json'), 'utf8'),
        manifest
    );
    assert.equal(await readFile(join(workspace, 'keep'), 'utf8'), 'same');
    await writeFile(join(workspace, 'keep'), 'drift');
    assert.throws(
        () =>
            applyDependencyOverlay(tree, workspace, {
                'package.json': manifest,
                'bun.lock': lock,
            }),
        /OID différent du tree/
    );
});
