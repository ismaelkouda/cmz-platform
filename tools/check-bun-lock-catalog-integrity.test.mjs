import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
    checkCatalogIntegrity,
    diffCatalog,
    diffNamedCatalogs,
    EXPECTED_CONFIG_VERSION,
    EXPECTED_LOCKFILE_VERSION,
    EXPECTED_PACKAGE_MANAGER,
} from './check-bun-lock-catalog-integrity.mjs';
import {
    parseJsonc,
    parseWithoutDuplicateKeys,
} from './check-library-setup-deps.mjs';

const validPackageJson = {
    packageManager: EXPECTED_PACKAGE_MANAGER,
    workspaces: {
        catalog: {
            '@angular/core': '22.0.7',
            rxjs: '7.8.2',
        },
        catalogs: {
            tooling: {
                typescript: '6.0.3',
            },
        },
    },
};

const validBunLock = {
    lockfileVersion: EXPECTED_LOCKFILE_VERSION,
    configVersion: EXPECTED_CONFIG_VERSION,
    catalog: {
        '@angular/core': '22.0.7',
        rxjs: '7.8.2',
    },
    catalogs: {
        tooling: {
            typescript: '6.0.3',
        },
    },
};

function clone(value) {
    return structuredClone(value);
}

test('accepte un miroir exact du catalog et des catalogs nommés', () => {
    assert.deepEqual(checkCatalogIntegrity(validPackageJson, validBunLock), {
        ok: true,
        errors: [],
    });
});

test('la comparaison ne dépend pas de l’ordre des clés', () => {
    assert.deepEqual(
        diffCatalog({ a: '1', b: '2' }, { b: '2', a: '1' }, 'catalog'),
        []
    );
});

test('détecte entrée absente, version différente et entrée fantôme', () => {
    assert.deepEqual(
        diffCatalog({ a: '1', b: '2' }, { a: '9', c: '3' }, 'catalog'),
        [
            'catalog : "a" = "9" dans bun.lock, "1" dans package.json',
            'catalog : "b" absent de bun.lock',
            'catalog : "c" présent dans bun.lock mais absent de package.json',
        ]
    );
});

test('détecte catalog nommé absent, divergent et fantôme', () => {
    assert.deepEqual(
        diffNamedCatalogs(
            {
                tooling: { typescript: '6.0.3' },
                testing: { vitest: '4.1.10' },
            },
            {
                tooling: { typescript: '5.9.0' },
                legacy: { mocha: '11.0.0' },
            }
        ),
        [
            'catalogs."tooling" : "typescript" = "5.9.0" dans bun.lock, "6.0.3" dans package.json',
            'catalogs."testing" absent de bun.lock',
            'catalogs."legacy" présent dans bun.lock mais absent de package.json',
        ]
    );
});

test('échoue fermé sur les racines et sections non objet', () => {
    assert.deepEqual(checkCatalogIntegrity(null, validBunLock), {
        ok: false,
        errors: ['package.json : racine absente ou non objet.'],
    });
    assert.deepEqual(checkCatalogIntegrity(validPackageJson, []), {
        ok: false,
        errors: ['bun.lock : racine absente ou non objet.'],
    });
    assert.deepEqual(diffCatalog({}, [], 'catalog'), [
        'bun.lock : `catalog` absent ou non objet.',
    ]);
    assert.deepEqual(diffNamedCatalogs({}, null), [
        'bun.lock : `catalogs` absent ou non objet.',
    ]);
});

test('fige les versions de format produites par Bun 1.3.14', () => {
    const changed = clone(validBunLock);
    changed.lockfileVersion = 2;
    delete changed.configVersion;

    const result = checkCatalogIntegrity(validPackageJson, changed);
    assert.equal(result.ok, false);
    assert.deepEqual(result.errors.slice(0, 2), [
        'bun.lock : `lockfileVersion` vaut 2, attendu 1 (Bun 1.3.14).',
        'bun.lock : `configVersion` vaut undefined, attendu 1 (Bun 1.3.14).',
    ]);
});

test('lie explicitement le garde à la version Bun du dépôt', () => {
    const changed = clone(validPackageJson);
    changed.packageManager = 'bun@1.4.0';

    const result = checkCatalogIntegrity(changed, validBunLock);
    assert.equal(result.ok, false);
    assert.match(result.errors.join('\n'), /packageManager.*bun@1\.4\.0/);
    assert.match(result.errors.join('\n'), /format du lockfile/);
});

test('détecte la suppression catalog/catalogs observée chez Dependabot', () => {
    const stripped = clone(validBunLock);
    delete stripped.catalog;
    delete stripped.catalogs;

    const result = checkCatalogIntegrity(validPackageJson, stripped);
    assert.equal(result.ok, false);
    assert.match(result.errors.join('\n'), /@angular\/core.*absent/);
    assert.match(result.errors.join('\n'), /catalogs\."tooling".*absent/);
});

test('les vrais package.json et bun.lock du dépôt satisfont le contrat', () => {
    const root = join(dirname(fileURLToPath(import.meta.url)), '..');
    const packageJson = parseWithoutDuplicateKeys(
        readFileSync(join(root, 'package.json'), 'utf8'),
        'package.json'
    );
    const bunLock = parseJsonc(
        readFileSync(join(root, 'bun.lock'), 'utf8'),
        'bun.lock'
    );

    assert.deepEqual(checkCatalogIntegrity(packageJson, bunLock), {
        ok: true,
        errors: [],
    });
});
