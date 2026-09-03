import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import {
    detectAppPlatform,
    validateRecipes,
    verifyApps,
    verifyWorkspaceDependency,
} from './check-library-setup.mjs';
import {
    scaffold,
    validRecipe,
    write,
} from './check-library-setup-fixture.mjs';

// Suite 2/2 : verifyApps (manifeste obligatoire, cohérence plateforme,
// dépendances structurelles, confinement) + helpers exportés.

const workingRecipes = () => ({ demo: validRecipe() });

const manifest = (libraries = [], overrides = {}) => ({
    schema_version: '1.0.0',
    kind: 'app-library-manifest',
    platform: 'angular',
    libraries,
    ...overrides,
});

test('app avec project.json + manifeste + invariants satisfaits → ok', async (t) => {
    const root = await scaffold(t, {
        recipes: workingRecipes(),
        apps: {
            'demo-app': {
                manifest: manifest(['demo']),
                files: { 'demo.config.ts': 'export const demoFeature = 1;' },
            },
        },
    });
    const result = verifyApps(root, validateRecipes(root).recipes);
    assert.deepEqual(result.errors, []);
    assert.equal(result.checkedApps, 1);
});

test('BYPASS : app avec project.json mais sans .cmz/libraries.json → échec', async (t) => {
    const root = await scaffold(t, {
        recipes: workingRecipes(),
        apps: { 'demo-app': { manifest: null } },
    });
    const result = verifyApps(root, validateRecipes(root).recipes);
    assert.equal(result.ok, false);
    assert.ok(
        result.errors.some((e) =>
            /project\.json mais pas de .*libraries\.json/.test(e)
        )
    );
});

test('BYPASS : bibliothèque gouvernée utilisée (empreinte) mais non déclarée → échec', async (t) => {
    const root = await scaffold(t, {
        recipes: workingRecipes(),
        apps: {
            'demo-app': {
                manifest: manifest([]),
                files: { 'demo.config.ts': 'export const demoFeature = 1;' },
            },
        },
    });
    const result = verifyApps(root, validateRecipes(root).recipes);
    assert.equal(result.ok, false);
    assert.ok(
        result.errors.some((e) =>
            /empreinte de "demo" présente.*absente de libraries/.test(e)
        )
    );
});

test('manifeste mal formé (kind) rejeté par le schéma', async (t) => {
    const root = await scaffold(t, {
        recipes: workingRecipes(),
        apps: { 'demo-app': { manifest: manifest([], { kind: 'mauvais' }) } },
    });
    assert.ok(
        verifyApps(root, validateRecipes(root).recipes).errors.some((e) =>
            /kind/.test(e)
        )
    );
});

test('platform du manifeste ≠ plateforme Nx détectée → échec', async (t) => {
    const root = await scaffold(t, {
        recipes: workingRecipes(),
        apps: {
            'demo-app': {
                project: {
                    name: 'demo-app',
                    targets: { build: { executor: '@nx/react:webpack' } },
                },
                manifest: manifest([]),
            },
        },
    });
    assert.ok(
        verifyApps(root, validateRecipes(root).recipes).errors.some((e) =>
            /plateforme Nx détectée "react"/.test(e)
        )
    );
});

test('recette platform ≠ manifeste platform → échec', async (t) => {
    const root = await scaffold(t, {
        recipes: { demo: validRecipe({ platform: 'react' }) },
        apps: {
            'demo-app': {
                project: {
                    name: 'demo-app',
                    targets: { build: { executor: '@nx/vite:build' } },
                },
                manifest: manifest(['demo']),
                files: { 'demo.config.ts': 'demoFeature' },
            },
        },
    });
    assert.ok(
        verifyApps(root, validateRecipes(root).recipes).errors.some((e) =>
            /recette platform "react" ≠ manifeste "angular"/.test(e)
        )
    );
});

test('bibliothèque déclarée sans recette → échec', async (t) => {
    const root = await scaffold(t, {
        recipes: workingRecipes(),
        apps: { 'demo-app': { manifest: manifest(['inconnue']) } },
    });
    assert.ok(
        verifyApps(root, validateRecipes(root).recipes).errors.some((e) =>
            /"inconnue" n'a pas de recette/.test(e)
        )
    );
});

test('paquet absent du package.json racine → échec', async (t) => {
    const root = await scaffold(t, {
        recipes: workingRecipes(),
        rootPackage: { dependencies: {}, workspaces: { catalog: {} } },
        apps: {
            'demo-app': {
                manifest: manifest(['demo']),
                files: { 'demo.config.ts': 'demoFeature' },
            },
        },
    });
    assert.ok(
        verifyApps(root, validateRecipes(root).recipes).errors.some((e) =>
            /demo-pkg absent des dépendances/.test(e)
        )
    );
});

test('paquet catalog: mais absent du catalog → échec', async (t) => {
    const root = await scaffold(t, {
        recipes: workingRecipes(),
        rootPackage: {
            dependencies: { 'demo-pkg': 'catalog:' },
            workspaces: { catalog: {} },
        },
        apps: {
            'demo-app': {
                manifest: manifest(['demo']),
                files: { 'demo.config.ts': 'demoFeature' },
            },
        },
    });
    assert.ok(
        verifyApps(root, validateRecipes(root).recipes).errors.some((e) =>
            /absent du catalog/.test(e)
        )
    );
});

test('paquet non verrouillé dans bun.lock → échec', async (t) => {
    const root = await scaffold(t, {
        recipes: workingRecipes(),
        bunLock: {
            lockfileVersion: 1,
            workspaces: { '': { dependencies: {} } },
            packages: {},
        },
        apps: {
            'demo-app': {
                manifest: manifest(['demo']),
                files: { 'demo.config.ts': 'demoFeature' },
            },
        },
    });
    assert.ok(
        verifyApps(root, validateRecipes(root).recipes).errors.some((e) =>
            /non verrouillé dans bun\.lock/.test(e)
        )
    );
});

test('static_invariant non satisfait dans l’arbre de l’app → échec', async (t) => {
    const root = await scaffold(t, {
        recipes: workingRecipes(),
        apps: {
            'demo-app': {
                manifest: manifest(['demo']),
                files: { 'demo.config.ts': 'rien de pertinent' },
            },
        },
    });
    assert.ok(
        verifyApps(root, validateRecipes(root).recipes).errors.some((e) =>
            /\[demo\/present\].*ne contient pas/.test(e)
        )
    );
});

test('invariants de coexistence : vérifiés seulement si les deux sont déclarées', async (t) => {
    const paired = validRecipe({
        library: 'demo',
        coexistence: [
            {
                with: 'autre',
                static_invariants: [
                    {
                        id: 'frontiere',
                        description: 'd',
                        assert: {
                            file: 'boundary.scss',
                            kind: 'file-contains',
                            value: 'FRONTIERE',
                        },
                    },
                ],
            },
        ],
    });
    const other = validRecipe({
        library: 'autre',
        packages: ['autre-pkg'],
        static_invariants: [
            {
                id: 'other-present',
                description: 'd',
                footprint: true,
                assert: {
                    file: 'autre.config.ts',
                    kind: 'file-contains',
                    value: 'autreFeature',
                },
            },
        ],
    });
    const rootPackage = {
        dependencies: { 'demo-pkg': 'catalog:', 'autre-pkg': 'catalog:' },
        workspaces: { catalog: { 'demo-pkg': '1', 'autre-pkg': '1' } },
    };
    const bunLock = {
        lockfileVersion: 1,
        workspaces: {
            '': {
                dependencies: {
                    'demo-pkg': 'catalog:',
                    'autre-pkg': 'catalog:',
                },
            },
        },
        packages: { 'demo-pkg': [], 'autre-pkg': [] },
    };

    const solo = await scaffold(t, {
        recipes: { demo: paired, autre: other },
        rootPackage,
        bunLock,
        apps: {
            'demo-app': {
                manifest: manifest(['demo']),
                files: { 'demo.config.ts': 'demoFeature' },
            },
        },
    });
    assert.deepEqual(
        verifyApps(solo, validateRecipes(solo).recipes).errors,
        []
    );

    const both = await scaffold(t, {
        recipes: { demo: paired, autre: other },
        rootPackage,
        bunLock,
        apps: {
            'demo-app': {
                manifest: manifest(['demo', 'autre']),
                files: {
                    'demo.config.ts': 'demoFeature',
                    'autre.config.ts': 'autreFeature',
                    'boundary.scss': '/* pas de frontiere */',
                },
            },
        },
    });
    assert.ok(
        verifyApps(both, validateRecipes(both).recipes).errors.some((e) =>
            /\[demo\+autre\/frontiere\]/.test(e)
        )
    );
});

test('symlink sur un chemin inspecté → échec', async (t) => {
    const root = await scaffold(t, {
        recipes: workingRecipes(),
        apps: {
            'demo-app': {
                manifest: manifest(['demo']),
                symlinks: { 'demo.config.ts': '/etc/hosts' },
            },
        },
    });
    assert.ok(
        verifyApps(root, validateRecipes(root).recipes).errors.some((e) =>
            /lien symbolique \(interdit\)/.test(e)
        )
    );
});

test('app sans project.json ignorée', async (t) => {
    const root = await scaffold(t, { recipes: workingRecipes() });
    await write(join(root, 'apps/pas-un-projet/README.md'), 'x');
    const result = verifyApps(root, validateRecipes(root).recipes);
    assert.deepEqual(result.errors, []);
    assert.equal(result.checkedApps, 0);
});

test('detectAppPlatform : angular / react / unknown / null', async (t) => {
    const root = await mkdtemp(join(tmpdir(), 'cmz-platform-detect-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    await write(join(root, 'ng/project.json'), {
        targets: { build: { executor: '@angular/build:application' } },
    });
    await write(join(root, 'rx/project.json'), {
        targets: { build: { executor: '@nx/react:webpack' } },
    });
    await write(join(root, 'weird/project.json'), {
        targets: { build: { executor: '@nx/js:tsc' } },
    });
    assert.equal(detectAppPlatform(join(root, 'ng')), 'angular');
    assert.equal(detectAppPlatform(join(root, 'rx')), 'react');
    assert.equal(detectAppPlatform(join(root, 'weird')), 'unknown');
    assert.equal(detectAppPlatform(join(root, 'absent')), null);
});

test('verifyWorkspaceDependency : chaîne complète package.json + catalog + lockfile', async (t) => {
    const root = await mkdtemp(join(tmpdir(), 'cmz-dep-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    await write(join(root, 'package.json'), {
        devDependencies: { pkg: 'catalog:tooling' },
        workspaces: { catalogs: { tooling: { pkg: '1.0.0' } } },
    });
    await write(
        join(root, 'bun.lock'),
        JSON.stringify({
            workspaces: { '': { devDependencies: { pkg: 'catalog:tooling' } } },
            packages: { pkg: [] },
        })
    );
    assert.deepEqual(verifyWorkspaceDependency(root, 'pkg'), []);
    assert.ok(
        verifyWorkspaceDependency(root, 'autre')[0].includes(
            'absent des dépendances'
        )
    );
});
