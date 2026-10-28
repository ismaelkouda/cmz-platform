import assert from 'node:assert/strict';
import { test } from 'node:test';
import semver from 'semver';

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
        'react/tailwind',
    ]);
});

function candidateMatrix() {
    const recipes = validateRecipes(root);
    const result = validateCompatibilityMatrices(root, recipes.recipes);
    const matrix = structuredClone(
        result.matrices.get('angular/angular-material')
    );
    for (const entry of matrix.tracks) {
        entry.status = 'candidate';
        entry.verification = null;
    }
    const versions = Object.fromEntries(
        Object.entries(matrix.tracks[0].requirements).map(([tool, range]) => [
            tool,
            semver.minVersion(range).version,
        ])
    );
    return { matrix, versions };
}

test('sélectionne exactement une piste avec les quatre versions dérivées de la piste réelle', () => {
    const { matrix, versions } = candidateMatrix();
    const track = selectCompatibilityTrack(matrix, versions, {
        requiredStatus: 'candidate',
    });
    assert.equal(track.id, matrix.tracks[0].id);
    const outsideNode = semver.inc(versions.node, 'major');
    assert.equal(semver.satisfies(outsideNode, track.requirements.node), false);
    assert.throws(
        () =>
            selectCompatibilityTrack(
                matrix,
                { ...versions, node: outsideNode },
                { requiredStatus: 'candidate' }
            ),
        /0 piste candidate compatible/
    );
    assert.throws(
        () =>
            selectCompatibilityTrack(
                matrix,
                { ...versions, node: `${versions.node}-rc.1` },
                { requiredStatus: 'candidate' }
            ),
        /0 piste candidate compatible/
    );
    assert.throws(
        () =>
            selectCompatibilityTrack(
                {
                    ...matrix,
                    tracks: [
                        track,
                        { ...structuredClone(track), id: 'ambiguous' },
                    ],
                },
                versions,
                { requiredStatus: 'candidate' }
            ),
        /2 piste candidate compatible/
    );
});

test('une piste candidate ne peut jamais servir au chemin nominal', () => {
    const { matrix, versions } = candidateMatrix();
    assert.equal(
        selectCompatibilityTrack(matrix, versions, {
            requiredStatus: 'candidate',
        }).id,
        matrix.tracks[0].id
    );
    assert.throws(
        () => selectCompatibilityTrack(matrix, versions),
        /0 piste verified compatible/
    );
});
