import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import {
    loadLibraryConfiguration,
    requiresBrowserProof,
} from './add-library-core.mjs';

const repository = new URL('../..', import.meta.url).pathname;

test('sélectionne la recette par plateforme Nx et ne mute jamais le registre partagé', () => {
    const status = JSON.parse(
        readFileSync(
            join(
                repository,
                'conventions/libraries/angular/tailwind.compat.json'
            ),
            'utf8'
        )
    ).tracks[0].status;
    const first = loadLibraryConfiguration(
        repository,
        'backoffice-angular',
        'tailwind',
        { requiredTrackStatus: status }
    );
    assert.equal(first.platform, 'angular');
    assert.equal(first.recipe.platform, 'angular');
    assert.equal(first.recipe.library, 'tailwind');
    assert.equal(Object.hasOwn(first.recipe, 'app'), false);
    const initialPackages = structuredClone(first.track.packages);
    first.recipe.library = 'altérée';
    first.track.packages.tailwindcss = '0.0.0';
    assert.notDeepEqual(first.track.packages, initialPackages);

    const second = loadLibraryConfiguration(
        repository,
        'backoffice-angular',
        'tailwind',
        { requiredTrackStatus: status }
    );
    assert.equal(second.recipe.library, 'tailwind');
    assert.deepEqual(second.track.packages, initialPackages);
});

test('échoue pour une app dont la plateforme est indéterminable', () => {
    assert.throws(
        () => loadLibraryConfiguration(repository, 'app-absente', 'tailwind'),
        /plateforme Nx indéterminée/
    );
});

test('approvisionne un navigateur pour chaque preuve qui rend du CSS', () => {
    assert.equal(
        requiresBrowserProof([{ proof: 'browser-style-preservation' }]),
        true
    );
    assert.equal(
        requiresBrowserProof([{ proof: 'browser-coexistence' }]),
        true
    );
    assert.equal(requiresBrowserProof([{ proof: 'production-build' }]), false);
});
