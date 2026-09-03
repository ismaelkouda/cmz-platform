import assert from 'node:assert/strict';
import { test } from 'node:test';

import { validateRecipes } from './check-library-setup.mjs';
import {
    REPO_ROOT,
    scaffold,
    validRecipe,
} from './check-library-setup-fixture.mjs';

// Suite 1/2 : validateRecipes (schéma fermé + cohérence inter-champs).
// La suite verifyApps est dans check-library-setup-apps.test.mjs (plafond 800 l.).

test('les recettes réelles du dépôt sont toutes valides', () => {
    const result = validateRecipes(REPO_ROOT);
    assert.deepEqual(result.errors, []);
    assert.deepEqual([...result.recipes.keys()].sort(), [
        'angular-material',
        'tailwind',
        'transloco',
    ]);
});

test('aucune recette = échec (fail-closed)', async (t) => {
    const root = await scaffold(t);
    const result = validateRecipes(root);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => /aucune recette/.test(e)));
});

test('clé de premier niveau inconnue rejetée par le schéma', async (t) => {
    const root = await scaffold(t, {
        recipes: { demo: validRecipe({ extra: 'non prévu' }) },
    });
    const result = validateRecipes(root);
    assert.ok(
        result.errors.some((e) => /additional property is not allowed/.test(e))
    );
});

test('platform hors enum rejetée', async (t) => {
    const root = await scaffold(t, {
        recipes: { demo: validRecipe({ platform: 'flutter' }) },
    });
    assert.ok(validateRecipes(root).errors.some((e) => /\$\.platform/.test(e)));
});

test('guidance non-https rejetée', async (t) => {
    const root = await scaffold(t, {
        recipes: { demo: validRecipe({ guidance: 'http://x.com' }) },
    });
    assert.ok(validateRecipes(root).errors.some((e) => /\$\.guidance/.test(e)));
});

test('library ≠ nom de fichier ET identifiant dupliqué', async (t) => {
    const root = await scaffold(t, {
        recipes: {
            demo: validRecipe(),
            autre: validRecipe({ library: 'demo' }),
        },
    });
    const errors = validateRecipes(root).errors;
    assert.ok(errors.some((e) => /≠ nom de fichier/.test(e)));
    assert.ok(errors.some((e) => /déjà défini par une autre recette/.test(e)));
});

test('install: official-schematic sans command → oneOf 0', async (t) => {
    const root = await scaffold(t, {
        recipes: {
            demo: validRecipe({
                install: { method: 'official-schematic', notes: 'x' },
            }),
        },
    });
    assert.ok(
        validateRecipes(root).errors.some((e) =>
            /must match exactly one subschema of oneOf/.test(e)
        )
    );
});

test('install: reference-derived sans reference_tool → oneOf 0', async (t) => {
    const root = await scaffold(t, {
        recipes: {
            demo: validRecipe({
                install: { method: 'reference-derived', notes: 'x' },
            }),
        },
    });
    assert.ok(validateRecipes(root).errors.some((e) => /oneOf/.test(e)));
});

test('install: command en chaîne shell (pas {executable,argv}) rejetée', async (t) => {
    const root = await scaffold(t, {
        recipes: {
            demo: validRecipe({
                install: {
                    method: 'official-schematic',
                    command: 'ng add @angular/material',
                    notes: 'x',
                },
            }),
        },
    });
    assert.ok(validateRecipes(root).errors.some((e) => /oneOf/.test(e)));
});

test('install: executable avec espace/slash rejeté par le pattern', async (t) => {
    const root = await scaffold(t, {
        recipes: {
            demo: validRecipe({
                install: {
                    method: 'official-schematic',
                    command: { executable: 'ng add', argv: ['x'] },
                    notes: 'x',
                },
            }),
        },
    });
    assert.ok(validateRecipes(root).errors.some((e) => /oneOf/.test(e)));
});

test('reference_tool hors tools/ rejeté par le pattern', async (t) => {
    const root = await scaffold(t, {
        recipes: {
            demo: validRecipe({
                install: {
                    method: 'reference-derived',
                    reference_tool: 'secrets/leak.mjs',
                    notes: 'x',
                },
            }),
        },
    });
    assert.ok(validateRecipes(root).errors.some((e) => /oneOf/.test(e)));
});

test('reference_tool inexistant → erreur runtime', async (t) => {
    const root = await scaffold(t, {
        recipes: {
            demo: validRecipe({
                install: {
                    method: 'reference-derived',
                    reference_tool: 'tools/does-not-exist.mjs',
                    notes: 'x',
                },
            }),
        },
    });
    assert.ok(
        validateRecipes(root).errors.some((e) =>
            /reference_tool.*introuvable/.test(e)
        )
    );
});

test('zéro empreinte → erreur', async (t) => {
    const root = await scaffold(t, {
        recipes: {
            demo: validRecipe({
                static_invariants: [
                    {
                        id: 'a',
                        description: 'd',
                        assert: { file: 'a.ts', kind: 'file-exists' },
                    },
                ],
            }),
        },
    });
    assert.ok(
        validateRecipes(root).errors.some((e) =>
            /exactement un static_invariant.*footprint/.test(e)
        )
    );
});

test('deux empreintes → erreur', async (t) => {
    const root = await scaffold(t, {
        recipes: {
            demo: validRecipe({
                static_invariants: [
                    {
                        id: 'a',
                        description: 'd',
                        footprint: true,
                        assert: {
                            file: 'a.ts',
                            kind: 'file-contains',
                            value: 'x',
                        },
                    },
                    {
                        id: 'b',
                        description: 'd',
                        footprint: true,
                        assert: {
                            file: 'b.ts',
                            kind: 'file-contains',
                            value: 'y',
                        },
                    },
                ],
            }),
        },
    });
    assert.ok(
        validateRecipes(root).errors.some((e) => /footprint.*\(2\)/.test(e))
    );
});

test('empreinte sur file-exists → erreur (doit être positive)', async (t) => {
    const root = await scaffold(t, {
        recipes: {
            demo: validRecipe({
                static_invariants: [
                    {
                        id: 'a',
                        description: 'd',
                        footprint: true,
                        assert: { file: 'a.ts', kind: 'file-exists' },
                    },
                ],
            }),
        },
    });
    assert.ok(
        validateRecipes(root).errors.some((e) =>
            /empreinte.*file-contains ou file-matches/.test(e)
        )
    );
});

test('id d’invariant dupliqué (static vs runtime) → erreur', async (t) => {
    const root = await scaffold(t, {
        recipes: {
            demo: validRecipe({
                runtime_acceptance: [
                    {
                        id: 'present',
                        description: 'd',
                        proof: 'compile-component',
                        status: 'harness-pending',
                    },
                ],
            }),
        },
    });
    assert.ok(
        validateRecipes(root).errors.some((e) =>
            /id d'invariant dupliqué/.test(e)
        )
    );
});

test('regex file-matches invalide signalée', async (t) => {
    const root = await scaffold(t, {
        recipes: {
            demo: validRecipe({
                static_invariants: [
                    {
                        id: 'present',
                        description: 'd',
                        footprint: true,
                        assert: {
                            file: 'a.ts',
                            kind: 'file-matches',
                            value: '([a-z',
                        },
                    },
                ],
            }),
        },
    });
    assert.ok(
        validateRecipes(root).errors.some((e) => /regex invalide/.test(e))
    );
});

test('runtime_acceptance status "enforced" rejeté tant qu’aucun harnais n’existe', async (t) => {
    const root = await scaffold(t, {
        recipes: {
            demo: validRecipe({
                runtime_acceptance: [
                    {
                        id: 'works',
                        description: 'd',
                        proof: 'compile-component',
                        status: 'enforced',
                    },
                ],
            }),
        },
    });
    assert.ok(
        validateRecipes(root).errors.some((e) => /"enforced".*harnais/.test(e))
    );
});

test('assert.file avec segment `..` rejeté par le schéma', async (t) => {
    const root = await scaffold(t, {
        recipes: {
            demo: validRecipe({
                static_invariants: [
                    {
                        id: 'present',
                        description: 'd',
                        footprint: true,
                        assert: {
                            file: '../../../etc/passwd',
                            kind: 'file-contains',
                            value: 'root',
                        },
                    },
                ],
            }),
        },
    });
    assert.ok(validateRecipes(root).errors.some((e) => /oneOf/.test(e)));
});

test('assert.file dotfile accepté', async (t) => {
    const root = await scaffold(t, {
        recipes: {
            demo: validRecipe({
                static_invariants: [
                    {
                        id: 'present',
                        description: 'd',
                        footprint: true,
                        assert: {
                            file: '.postcssrc.json',
                            kind: 'file-contains',
                            value: 'x',
                        },
                    },
                ],
            }),
        },
    });
    assert.deepEqual(validateRecipes(root).errors, []);
});

test('coexistence.with inconnue / avec soi-même → erreurs', async (t) => {
    const root = await scaffold(t, {
        recipes: {
            demo: validRecipe({
                coexistence: [
                    {
                        with: 'demo',
                        static_invariants: [
                            {
                                id: 'x',
                                description: 'd',
                                assert: { file: 'a.ts', kind: 'file-exists' },
                            },
                        ],
                    },
                    {
                        with: 'fantome',
                        static_invariants: [
                            {
                                id: 'y',
                                description: 'd',
                                assert: { file: 'b.ts', kind: 'file-exists' },
                            },
                        ],
                    },
                ],
            }),
        },
    });
    const errors = validateRecipes(root).errors;
    assert.ok(errors.some((e) => /coexistence avec elle-même/.test(e)));
    assert.ok(errors.some((e) => /n'a pas de recette/.test(e)));
});
