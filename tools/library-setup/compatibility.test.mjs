import assert from 'node:assert/strict';
import { test } from 'node:test';

import { validateRecipes } from '../check-library-setup.mjs';
import { fileURLToPath } from 'node:url';
import {
    selectCompatibilityTrack,
    validateCompatibilityMatrices,
} from './compatibility.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));

test('chaque recette réelle possède une matrice fermée cohérente', () => {
    const recipes = validateRecipes(root);
    assert.deepEqual(recipes.errors, []);
    const result = validateCompatibilityMatrices(root, recipes.recipes);
    assert.deepEqual(result.errors, []);
    assert.deepEqual([...result.matrices.keys()].sort(), [
        'angular/angular-material',
        'angular/tailwind',
        'angular/transloco',
    ]);
});

test('sélectionne exactement une piste avec les quatre versions réelles', () => {
    const recipes = validateRecipes(root);
    const result = validateCompatibilityMatrices(root, recipes.recipes);
    const matrix = structuredClone(
        result.matrices.get('angular/angular-material')
    );
    for (const entry of matrix.tracks) {
        entry.status = 'candidate';
        entry.verification = null;
    }
    const track = selectCompatibilityTrack(
        matrix,
        { node: '22.22.3', bun: '1.3.14', nx: '23.1.0', framework: '22.0.7' },
        { requiredStatus: 'candidate' }
    );
    assert.equal(track.id, 'angular-22');
    assert.throws(
        () =>
            selectCompatibilityTrack(
                matrix,
                {
                    node: '24.0.0',
                    bun: '1.3.14',
                    nx: '23.1.0',
                    framework: '22.0.7',
                },
                { requiredStatus: 'candidate' }
            ),
        /0 piste candidate compatible/
    );
    assert.throws(
        () =>
            selectCompatibilityTrack(
                matrix,
                {
                    node: '22.22.3-rc.1',
                    bun: '1.3.14',
                    nx: '23.1.0',
                    framework: '22.0.7',
                },
                { requiredStatus: 'candidate' }
            ),
        /0 piste candidate compatible/
    );
    assert.throws(
        () =>
            selectCompatibilityTrack(
                {
                    platform: 'angular',
                    library: 'ambiguous',
                    tracks: [
                        {
                            status: 'candidate',
                            requirements: {
                                node: '>=22 <23',
                                bun: '>=1 <2',
                                nx: '>=23 <24',
                                framework: '>=22 <23',
                            },
                        },
                        {
                            status: 'candidate',
                            requirements: {
                                node: '>=22.1 <23',
                                bun: '>=1 <2',
                                nx: '>=23 <24',
                                framework: '>=22 <23',
                            },
                        },
                    ],
                },
                {
                    node: '22.22.3',
                    bun: '1.3.14',
                    nx: '23.1.0',
                    framework: '22.0.7',
                },
                { requiredStatus: 'candidate' }
            ),
        /2 piste candidate compatible/
    );
});

test('une piste candidate ne peut jamais servir au chemin nominal', () => {
    const recipes = validateRecipes(root);
    const result = validateCompatibilityMatrices(root, recipes.recipes);
    const matrix = structuredClone(
        result.matrices.get('angular/angular-material')
    );
    for (const entry of matrix.tracks) {
        entry.status = 'candidate';
        entry.verification = null;
    }
    assert.throws(
        () =>
            selectCompatibilityTrack(matrix, {
                node: '22.22.3',
                bun: '1.3.14',
                nx: '23.1.0',
                framework: '22.0.7',
            }),
        /0 piste verified compatible/
    );
});
