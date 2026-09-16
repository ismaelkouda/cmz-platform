import assert from 'node:assert/strict';
import {
    cpSync,
    mkdtempSync,
    readFileSync,
    realpathSync,
    writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { validateRecipes } from '../check-library-setup.mjs';
import { removeTemporaryFixture } from '../test-support/remove-temporary-fixture.mjs';
import { RUNTIME_ORACLE_KEYS } from './runtime-proofs.mjs';
import {
    libraryRunnerDigest,
    libraryRunnerSourceHashes,
    libraryRunnerSourcePaths,
    QUALIFICATION_ORACLE_SOURCE_PATHS,
} from './tooling-fingerprint.mjs';

const SOURCE = new URL('../..', import.meta.url).pathname;

function fixture(t) {
    const root = realpathSync(
        mkdtempSync(join(tmpdir(), 'cmz-tooling-fingerprint-'))
    );
    t.after(() => removeTemporaryFixture(root, 'cmz-tooling-fingerprint-'));
    cpSync(join(SOURCE, 'conventions'), join(root, 'conventions'), {
        recursive: true,
    });
    cpSync(join(SOURCE, 'tools'), join(root, 'tools'), { recursive: true });
    return root;
}

function configuration(root, library) {
    const result = validateRecipes(root);
    assert.equal(result.ok, true, result.errors.join(' ; '));
    return {
        recipe: result.recipes.get(`angular/${library}`),
        recipes: result.recipes,
    };
}

function digest(root, library) {
    const { recipe, recipes } = configuration(root, library);
    return libraryRunnerDigest(root, recipe, recipes);
}

function append(root, path, content = '\n// modification de test\n') {
    const absolute = join(root, path);
    writeFileSync(absolute, `${readFileSync(absolute, 'utf8')}${content}`);
}

test('chaque oracle enregistré possède une liste fermée de sources', () => {
    assert.deepEqual(
        [...QUALIFICATION_ORACLE_SOURCE_PATHS.keys()].sort(),
        [...RUNTIME_ORACLE_KEYS].sort()
    );
    for (const [key, paths] of QUALIFICATION_ORACLE_SOURCE_PATHS) {
        assert.ok(paths.length > 0, key);
        assert.equal(new Set(paths).size, paths.length, key);
        assert.ok(
            paths.every((path) => !path.endsWith('.test.mjs')),
            key
        );
    }
});

test('le manifeste exposé est trié, fermé et sans tests', () => {
    const { recipe, recipes } = configuration(SOURCE, 'angular-material');
    const paths = libraryRunnerSourcePaths(recipe, recipes);
    assert.deepEqual(paths, [...paths].sort());
    assert.equal(new Set(paths).size, paths.length);
    assert.ok(paths.every((path) => !path.endsWith('.test.mjs')));
    assert.ok(
        paths.includes(
            'tools/library-setup/runtime-oracles/material-component.mjs'
        )
    );
    assert.ok(
        !paths.includes(
            'tools/library-setup/runtime-oracles/transloco-render.mjs'
        )
    );
    assert.deepEqual(
        Object.keys(libraryRunnerSourceHashes(SOURCE, recipe, recipes)),
        paths
    );
});

test('une édition hors surface exécutable ne périme aucune piste', (t) => {
    const root = fixture(t);
    const before = {
        material: digest(root, 'angular-material'),
        tailwind: digest(root, 'tailwind'),
        transloco: digest(root, 'transloco'),
    };
    append(root, 'tools/library-setup/compatibility-promotion-runner.test.mjs');
    assert.deepEqual(
        {
            material: digest(root, 'angular-material'),
            tailwind: digest(root, 'tailwind'),
            transloco: digest(root, 'transloco'),
        },
        before
    );
});

test('un oracle étranger ne périme pas une piste indépendante', (t) => {
    const root = fixture(t);
    const materialBefore = digest(root, 'angular-material');
    const translocoBefore = digest(root, 'transloco');
    append(root, 'tools/library-setup/runtime-oracles/transloco-render.mjs');
    assert.equal(digest(root, 'angular-material'), materialBefore);
    assert.notEqual(digest(root, 'transloco'), translocoBefore);
});

test('une source propre ne périme que les pistes qui la consomment', (t) => {
    const root = fixture(t);
    const materialBefore = digest(root, 'angular-material');
    const tailwindBefore = digest(root, 'tailwind');
    append(root, 'tools/library-setup/runtime-fixtures/material-probe.ts');
    assert.notEqual(digest(root, 'angular-material'), materialBefore);
    assert.equal(digest(root, 'tailwind'), tailwindBefore);
});

test('une source commune sémantique périme toutes les pistes', (t) => {
    const root = fixture(t);
    const before = {
        material: digest(root, 'angular-material'),
        transloco: digest(root, 'transloco'),
    };
    append(root, 'tools/library-setup/sandbox.mjs');
    assert.notEqual(digest(root, 'angular-material'), before.material);
    assert.notEqual(digest(root, 'transloco'), before.transloco);
});

test('une acceptance sans surface déclarée échoue en fermeture', (t) => {
    const root = fixture(t);
    const { recipe, recipes } = configuration(root, 'transloco');
    recipe.runtime_acceptance.push({
        id: 'preuve-sans-sources',
        description: 'preuve de test sans manifeste',
        proof: 'compile-component',
        status: 'enforced',
    });
    recipes.set('angular/transloco', recipe);
    assert.throws(
        () => libraryRunnerSourcePaths(recipe, recipes),
        /sources d'oracle non déclarées/
    );
});
