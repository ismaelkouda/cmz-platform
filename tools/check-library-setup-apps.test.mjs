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
    versionSatisfies,
} from './check-library-setup.mjs';
import {
    manifest,
    scaffold,
    validRecipe,
    write,
} from './check-library-setup-fixture.mjs';

// Suite 2/2 : verifyApps (manifeste obligatoire, plateforme déterminée,
// dépendances cohérentes, confinement) + helpers exportés.

const recipesOf = (root) => validateRecipes(root).recipes;
const working = () => ({ demo: validRecipe() });

test('app avec project.json + manifeste + invariants satisfaits → ok', async (t) => {
    const root = await scaffold(t, {
        recipes: working(),
        apps: {
            'demo-app': {
                manifest: manifest(['demo']),
                files: { 'demo.config.ts': 'export const demoFeature = 1;' },
            },
        },
    });
    const result = verifyApps(root, recipesOf(root));
    assert.deepEqual(result.errors, []);
    assert.equal(result.checkedApps, 1);
});

test('BYPASS : app avec project.json régulier mais sans .cmz/libraries.json → échec', async (t) => {
    const root = await scaffold(t, {
        recipes: working(),
        apps: { 'demo-app': { manifest: null } },
    });
    assert.ok(
        verifyApps(root, recipesOf(root)).errors.some((e) =>
            /project\.json régulier mais pas de .*libraries\.json/.test(e)
        )
    );
});

test('BYPASS : dossier d’app est un lien symbolique → échec', async (t) => {
    const outside = await mkdtemp(join(tmpdir(), 'cmz-outside-'));
    t.after(() => rm(outside, { recursive: true, force: true }));
    await write(join(outside, 'project.json'), {
        name: 'demo-app',
        targets: { build: { executor: '@angular/build:application' } },
    });
    await write(join(outside, '.cmz/libraries.json'), manifest());
    const root = await scaffold(t, {
        recipes: working(),
        apps: { 'demo-app': { dirSymlink: outside } },
    });
    const result = verifyApps(root, recipesOf(root));
    assert.equal(result.ok, false);
    assert.ok(
        result.errors.some((e) =>
            /"demo-app" est un lien symbolique \(interdit\)/.test(e)
        )
    );
});

test('BYPASS : project.json est un lien symbolique (même cassé) → échec, jamais ignoré', async (t) => {
    const root = await scaffold(t, {
        recipes: working(),
        apps: {
            'demo-app': {
                project: null,
                manifest: manifest(),
                symlinks: { 'project.json': 'nowhere.json' },
            },
        },
    });
    const result = verifyApps(root, recipesOf(root));
    assert.equal(result.ok, false);
    assert.ok(
        result.errors.some((e) =>
            /project\.json.*lien symbolique \(interdit\)/.test(e)
        )
    );
});

test('BYPASS : fichier d’invariant est un lien symbolique → échec', async (t) => {
    const root = await scaffold(t, {
        recipes: working(),
        apps: {
            'demo-app': {
                manifest: manifest(['demo']),
                symlinks: { 'demo.config.ts': '/etc/hosts' },
            },
        },
    });
    assert.ok(
        verifyApps(root, recipesOf(root)).errors.some((e) =>
            /lien symbolique \(interdit\)/.test(e)
        )
    );
});

test('BYPASS : bibliothèque utilisée (empreinte) mais non déclarée → échec', async (t) => {
    const root = await scaffold(t, {
        recipes: working(),
        apps: {
            'demo-app': {
                manifest: manifest([]),
                files: { 'demo.config.ts': 'export const demoFeature = 1;' },
            },
        },
    });
    assert.ok(
        verifyApps(root, recipesOf(root)).errors.some((e) =>
            /empreinte de "demo" présente.*absente de libraries/.test(e)
        )
    );
});

test('BYPASS : empreinte via lien symbolique ne masque pas l’usage → échec', async (t) => {
    const root = await scaffold(t, {
        recipes: working(),
        apps: {
            'demo-app': {
                manifest: manifest([]),
                symlinks: { 'demo.config.ts': '/etc/hosts' },
            },
        },
    });
    assert.ok(
        verifyApps(root, recipesOf(root)).errors.some((e) =>
            /\[demo\/present\].*lien symbolique/.test(e)
        )
    );
});

test('BYPASS : plateforme Nx indéterminée (@nx/js:tsc seul) → échec', async (t) => {
    const root = await scaffold(t, {
        recipes: working(),
        apps: {
            'demo-app': {
                project: {
                    name: 'demo-app',
                    targets: { build: { executor: '@nx/js:tsc' } },
                },
                manifest: manifest([]),
            },
        },
    });
    assert.ok(
        verifyApps(root, recipesOf(root)).errors.some((e) =>
            /plateforme Nx indéterminée/.test(e)
        )
    );
});

test('manifeste mal formé (kind) rejeté par le schéma', async (t) => {
    const root = await scaffold(t, {
        recipes: working(),
        apps: { 'demo-app': { manifest: manifest([], { kind: 'mauvais' }) } },
    });
    assert.ok(
        verifyApps(root, recipesOf(root)).errors.some((e) => /kind/.test(e))
    );
});

test('platform du manifeste ≠ plateforme Nx détectée → échec', async (t) => {
    const root = await scaffold(t, {
        recipes: working(),
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
        verifyApps(root, recipesOf(root)).errors.some((e) =>
            /plateforme Nx détectée "react"/.test(e)
        )
    );
});

test('bibliothèque déclarée sans recette pour la plateforme → échec', async (t) => {
    const root = await scaffold(t, {
        recipes: working(),
        apps: { 'demo-app': { manifest: manifest(['inconnue']) } },
    });
    assert.ok(
        verifyApps(root, recipesOf(root)).errors.some((e) =>
            /"inconnue" n'a pas de recette pour angular/.test(e)
        )
    );
});

test('paquet absent du package.json racine → échec', async (t) => {
    const root = await scaffold(t, {
        recipes: working(),
        rootPackage: { dependencies: {}, workspaces: { catalog: {} } },
        apps: {
            'demo-app': {
                manifest: manifest(['demo']),
                files: { 'demo.config.ts': 'demoFeature' },
            },
        },
    });
    assert.ok(
        verifyApps(root, recipesOf(root)).errors.some((e) =>
            /demo-pkg absent des dépendances/.test(e)
        )
    );
});

test('BYPASS : lockfile incohérent (spec + version) → échec', async (t) => {
    const root = await scaffold(t, {
        recipes: working(),
        rootPackage: {
            dependencies: { 'demo-pkg': 'catalog:' },
            workspaces: { catalog: { 'demo-pkg': '1.0.0' } },
        },
        bunLock: {
            lockfileVersion: 1,
            workspaces: {
                '': { dependencies: { 'demo-pkg': 'catalog:WRONG' } },
            },
            packages: { 'demo-pkg': ['demo-pkg@9.9.9'] },
        },
        apps: {
            'demo-app': {
                manifest: manifest(['demo']),
                files: { 'demo.config.ts': 'demoFeature' },
            },
        },
    });
    const errors = verifyApps(root, recipesOf(root)).errors;
    assert.ok(errors.some((e) => /spec "catalog:".*≠ "catalog:WRONG"/.test(e)));
    assert.ok(
        errors.some((e) =>
            /version résolue "9\.9\.9" ne satisfait pas le catalog "1\.0\.0"/.test(
                e
            )
        )
    );
});

test('catalog en plage caret : version résolue qui satisfait → ok ; sinon → échec', async (t) => {
    const base = (lockVersion) => ({
        recipes: working(),
        rootPackage: {
            dependencies: { 'demo-pkg': 'catalog:' },
            workspaces: { catalog: { 'demo-pkg': '^1.2.0' } },
        },
        bunLock: {
            lockfileVersion: 1,
            workspaces: { '': { dependencies: { 'demo-pkg': 'catalog:' } } },
            packages: { 'demo-pkg': [`demo-pkg@${lockVersion}`] },
        },
        apps: {
            'demo-app': {
                manifest: manifest(['demo']),
                files: { 'demo.config.ts': 'demoFeature' },
            },
        },
    });
    const ok = await scaffold(t, base('1.2.9'));
    assert.deepEqual(verifyApps(ok, recipesOf(ok)).errors, []);

    const bad = await scaffold(t, base('2.0.0'));
    assert.ok(
        verifyApps(bad, recipesOf(bad)).errors.some((e) =>
            /ne satisfait pas le catalog "\^1\.2\.0"/.test(e)
        )
    );
});

test('catalog en forme non interprétable → échec explicite', async (t) => {
    const root = await scaffold(t, {
        recipes: working(),
        rootPackage: {
            dependencies: { 'demo-pkg': 'catalog:' },
            workspaces: { catalog: { 'demo-pkg': '>=1 <2' } },
        },
        bunLock: {
            lockfileVersion: 1,
            workspaces: { '': { dependencies: { 'demo-pkg': 'catalog:' } } },
            packages: { 'demo-pkg': ['demo-pkg@1.5.0'] },
        },
        apps: {
            'demo-app': {
                manifest: manifest(['demo']),
                files: { 'demo.config.ts': 'demoFeature' },
            },
        },
    });
    assert.ok(
        verifyApps(root, recipesOf(root)).errors.some((e) =>
            /non interprétable/.test(e)
        )
    );
});

test('static_invariant non satisfait dans l’arbre de l’app → échec', async (t) => {
    const root = await scaffold(t, {
        recipes: working(),
        apps: {
            'demo-app': {
                manifest: manifest(['demo']),
                files: { 'demo.config.ts': 'rien de pertinent' },
            },
        },
    });
    assert.ok(
        verifyApps(root, recipesOf(root)).errors.some((e) =>
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
        workspaces: {
            catalog: { 'demo-pkg': '1.0.0', 'autre-pkg': '1.0.0' },
        },
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
        packages: {
            'demo-pkg': ['demo-pkg@1.0.0'],
            'autre-pkg': ['autre-pkg@1.0.0'],
        },
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
    assert.deepEqual(verifyApps(solo, recipesOf(solo)).errors, []);

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
        verifyApps(both, recipesOf(both)).errors.some((e) =>
            /\[demo\+autre\/frontiere\]/.test(e)
        )
    );
});

test('app sans project.json ignorée ; fichier isolé dans apps/ ignoré', async (t) => {
    const root = await scaffold(t, { recipes: working() });
    await write(join(root, 'apps/pas-un-projet/README.md'), 'x');
    await write(join(root, 'apps/notes.txt'), 'x');
    const result = verifyApps(root, recipesOf(root));
    assert.deepEqual(result.errors, []);
    assert.equal(result.checkedApps, 0);
});

test('detectAppPlatform : un seul résultat, sinon unknown (jamais "premier gagné")', async (t) => {
    const root = await mkdtemp(join(tmpdir(), 'cmz-platform-detect-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    await write(join(root, 'ng/project.json'), {
        targets: { build: { executor: '@angular/build:application' } },
    });
    await write(join(root, 'rx/project.json'), {
        targets: {
            build: { executor: '@nx/react:module-federation-dev-server' },
        },
    });
    // bundler générique seul → ne prouve rien
    await write(join(root, 'vite-only/project.json'), {
        targets: { build: { executor: '@nx/vite:build' } },
    });
    // Angular ET React → ambigu
    await write(join(root, 'both/project.json'), {
        targets: {
            build: { executor: '@angular/build:application' },
            e2e: { executor: '@nx/react:webpack' },
        },
    });
    await write(join(root, 'weird/project.json'), {
        targets: { build: { executor: '@nx/js:tsc' } },
    });
    assert.equal(detectAppPlatform(join(root, 'ng')), 'angular');
    assert.equal(detectAppPlatform(join(root, 'rx')), 'react');
    assert.equal(detectAppPlatform(join(root, 'vite-only')), 'unknown');
    assert.equal(detectAppPlatform(join(root, 'both')), 'unknown');
    assert.equal(detectAppPlatform(join(root, 'weird')), 'unknown');
    assert.equal(detectAppPlatform(join(root, 'absent')), null);
});

test('versionSatisfies : exact / caret / tilde ; formes non interprétables → null', () => {
    assert.equal(versionSatisfies('1.2.3', '1.2.3'), true);
    assert.equal(versionSatisfies('1.2.4', '1.2.3'), false);
    assert.equal(versionSatisfies('1.2.3', '^1.2.0'), true); // cas `ol:^10.9.0`
    assert.equal(versionSatisfies('1.9.9', '^1.2.0'), true);
    assert.equal(versionSatisfies('2.0.0', '^1.2.0'), false);
    assert.equal(versionSatisfies('1.1.0', '^1.2.0'), false);
    assert.equal(versionSatisfies('0.9.5', '^0.9.0'), true);
    assert.equal(versionSatisfies('0.10.0', '^0.9.0'), false);
    assert.equal(versionSatisfies('10.9.5', '~10.9.0'), true);
    assert.equal(versionSatisfies('10.10.0', '~10.9.0'), false);
    assert.equal(versionSatisfies('1.2.3', '>=1 <2'), null);
    assert.equal(versionSatisfies('1.2.3', '1.x'), null);
    assert.equal(versionSatisfies('pas-une-version', '1.2.3'), null);
});

test('verifyWorkspaceDependency : chaîne complète + cohérence version', async (t) => {
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
            packages: { pkg: ['pkg@1.0.0'] },
        })
    );
    assert.deepEqual(verifyWorkspaceDependency(root, 'pkg'), []);
    assert.ok(
        verifyWorkspaceDependency(root, 'autre')[0].includes(
            'absent des dépendances'
        )
    );
});
