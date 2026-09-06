import assert from 'node:assert/strict';
import { test } from 'node:test';

import { loadLibraryConfiguration } from './add-library-core.mjs';

const repository = new URL('../..', import.meta.url).pathname;

test('sélectionne la recette par plateforme Nx et ne mute jamais le registre partagé', () => {
    const first = loadLibraryConfiguration(
        repository,
        'backoffice-angular',
        'tailwind'
    );
    assert.equal(first.platform, 'angular');
    assert.equal(first.recipe.platform, 'angular');
    assert.equal(first.recipe.library, 'tailwind');
    assert.equal(Object.hasOwn(first.recipe, 'app'), false);
    first.recipe.library = 'altérée';
    first.track.packages.tailwindcss = '0.0.0';

    const second = loadLibraryConfiguration(
        repository,
        'backoffice-angular',
        'tailwind'
    );
    assert.equal(second.recipe.library, 'tailwind');
    assert.equal(second.track.packages.tailwindcss, '4.1.13');
});

test('échoue pour une app dont la plateforme est indéterminable', () => {
    assert.throws(
        () => loadLibraryConfiguration(repository, 'app-absente', 'tailwind'),
        /plateforme Nx indéterminée/
    );
});
