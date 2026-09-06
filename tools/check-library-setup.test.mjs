import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { validateRecipes } from './check-library-setup.mjs';
import {
    link,
    REPO_ROOT,
    scaffold,
    validRecipe,
    write,
} from './check-library-setup-fixture.mjs';

// Suite 1/2 : validateRecipes (lecture confinée + schéma fermé + cohérence).
// Suite verifyApps : check-library-setup-apps.test.mjs (plafond 800 l.).

const officialSchematic = {
    method: 'official-schematic',
    command: {
        executable: 'nx',
        argv: ['g', 'demo:ng-add', '--project', '{{app}}'],
    },
    notes: 'x',
};

test('les recettes réelles du dépôt sont toutes valides', () => {
    const result = validateRecipes(REPO_ROOT);
    assert.deepEqual(result.errors, []);
    assert.deepEqual([...result.recipes.keys()].sort(), [
        'angular/angular-material',
        'angular/tailwind',
        'angular/transloco',
    ]);
});

test('aucune recette = échec (fail-closed)', async (t) => {
    const root = await scaffold(t);
    assert.ok(
        validateRecipes(root).errors.some((e) => /aucune recette/.test(e))
    );
});

test('official-schematic bien formée passe', async (t) => {
    const root = await scaffold(t, {
        recipes: { demo: validRecipe({ install: officialSchematic }) },
    });
    assert.deepEqual(validateRecipes(root).errors, []);
});

test('clé de premier niveau inconnue rejetée par le schéma', async (t) => {
    const root = await scaffold(t, {
        recipes: { demo: validRecipe({ extra: 'non prévu' }) },
    });
    assert.ok(
        validateRecipes(root).errors.some((e) =>
            /additional property is not allowed/.test(e)
        )
    );
});

test('platform hors enum (kotlin/swift retirés) rejetée', async (t) => {
    const root = await scaffold(t, {
        recipes: { demo: validRecipe({ platform: 'kotlin' }) },
    });
    assert.ok(validateRecipes(root).errors.some((e) => /\$\.platform/.test(e)));
});

test('platform ≠ dossier parent rejetée', async (t) => {
    const root = await scaffold(t);
    // écrit sous angular/ mais déclare react
    await write(
        join(root, 'conventions/libraries/angular/demo.setup.json'),
        validRecipe({ platform: 'react' })
    );
    assert.ok(
        validateRecipes(root).errors.some((e) => /≠ dossier "angular"/.test(e))
    );
});

test('guidance non-https rejetée', async (t) => {
    const root = await scaffold(t, {
        recipes: { demo: validRecipe({ guidance: 'http://x.com' }) },
    });
    assert.ok(validateRecipes(root).errors.some((e) => /\$\.guidance/.test(e)));
});

test('library ≠ nom de fichier ET couple (platform, library) dupliqué', async (t) => {
    const root = await scaffold(t, {
        recipes: {
            demo: validRecipe(),
            autre: validRecipe({ library: 'demo' }),
        },
    });
    const errors = validateRecipes(root).errors;
    assert.ok(errors.some((e) => /≠ nom de fichier/.test(e)));
    assert.ok(errors.some((e) => /\(angular\/demo\) déjà défini/.test(e)));
});

test('official-schematic sans command → oneOf 0', async (t) => {
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

test('command en chaîne shell (pas {executable,argv}) rejetée', async (t) => {
    const root = await scaffold(t, {
        recipes: {
            demo: validRecipe({
                install: {
                    method: 'official-schematic',
                    command: 'nx g demo:ng-add',
                    notes: 'x',
                },
            }),
        },
    });
    assert.ok(validateRecipes(root).errors.some((e) => /oneOf/.test(e)));
});

test('executable hors enum ["nx"] rejeté', async (t) => {
    const root = await scaffold(t, {
        recipes: {
            demo: validRecipe({
                install: {
                    method: 'official-schematic',
                    command: {
                        executable: 'ng',
                        argv: ['add', 'x', '{{app}}'],
                    },
                    notes: 'x',
                },
            }),
        },
    });
    assert.ok(validateRecipes(root).errors.some((e) => /oneOf/.test(e)));
});

test('official-schematic sans jeton {{app}} rejetée', async (t) => {
    const root = await scaffold(t, {
        recipes: {
            demo: validRecipe({
                install: {
                    method: 'official-schematic',
                    command: { executable: 'nx', argv: ['g', 'demo:ng-add'] },
                    notes: 'x',
                },
            }),
        },
    });
    assert.ok(
        validateRecipes(root).errors.some((e) =>
            /exactement un argument "\{\{app\}\}"/.test(e)
        )
    );
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

test('zéro / deux empreintes → erreur', async (t) => {
    const zero = await scaffold(t, {
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
        validateRecipes(zero).errors.some((e) => /footprint.*\(0\)/.test(e))
    );

    const two = await scaffold(t, {
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
        validateRecipes(two).errors.some((e) => /footprint.*\(2\)/.test(e))
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

// `status` doit correspondre à l'existence d'un oracle enregistré, dans les
// DEUX sens : « enforced » sans oracle est une garantie creuse, et
// « harness-pending » avec oracle cache une preuve déjà livrée — c'est ce
// second cas qui masquait trois oracles réels jusqu'au 2026-09-06.
test('runtime_acceptance "enforced" exige un oracle enregistré', async (t) => {
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
        validateRecipes(root).errors.some((e) =>
            /"enforced" sans oracle enregistré/.test(e)
        )
    );
});

test('un oracle enregistré interdit de rester "harness-pending"', () => {
    const recipes = validateRecipes(REPO_ROOT);
    assert.equal(recipes.ok, true, recipes.errors.join(' ; '));
    const material = recipes.recipes.get('angular/angular-material');
    assert.equal(
        material.runtime_acceptance.find(
            (entry) => entry.id === 'material-component-compiles'
        ).status,
        'enforced'
    );
    const coexistence = material.coexistence.find(
        (block) => block.with === 'tailwind'
    ).runtime_acceptance;
    assert.deepEqual(
        coexistence.map(
            (entry) => `${entry.id}:${entry.proof}:${entry.status}`
        ),
        [
            'material-tailwind-cascade-order:compiled-css-rule:enforced',
            'material-tailwind-render-together:browser-coexistence:enforced',
        ]
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
                        intent: 'frontière documentée',
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
                        intent: 'frontière documentée',
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
    assert.ok(errors.some((e) => /n'a pas de recette pour angular/.test(e)));
});

// Décision du 2026-09-06 : l'invariant en prose `component-boundary` est
// retiré (un regex cherchant deux mots dans un commentaire ne peut pas
// régresser et passe sur n'importe quel `// TODO`). En contrepartie, un bloc de
// coexistence ne peut pas devenir décoratif : il doit porter au moins un
// contrôle réel. Sans la branche `anyOf` du validateur — absente jusqu'à ce
// jour, donc fail-open — cette contrainte ne contraindrait rien.
test('un bloc de coexistence sans aucun contrôle est refusé', async (t) => {
    const sansControle = await scaffold(t, {
        recipes: {
            demo: validRecipe({
                coexistence: [{ with: 'autre', intent: 'décoratif' }],
            }),
            autre: validRecipe({ library: 'autre' }),
        },
    });
    assert.ok(
        validateRecipes(sansControle).errors.some((e) =>
            /must match at least one subschema of anyOf/.test(e)
        )
    );

    const sansIntention = await scaffold(t, {
        recipes: {
            demo: validRecipe({
                coexistence: [
                    {
                        with: 'autre',
                        runtime_acceptance: [
                            {
                                id: 'preuve',
                                description: 'd',
                                proof: 'browser-coexistence',
                                status: 'harness-pending',
                            },
                        ],
                    },
                ],
            }),
            autre: validRecipe({ library: 'autre' }),
        },
    });
    assert.ok(
        validateRecipes(sansIntention).errors.some((e) =>
            /\.intent: is required/.test(e)
        )
    );

    // Porter uniquement des acceptances runtime reste valide : c'est
    // exactement la forme du bloc Material+Tailwind après la décision.
    const acceptancesSeules = await scaffold(t, {
        recipes: {
            demo: validRecipe({
                coexistence: [
                    {
                        with: 'autre',
                        intent: 'ce que la coexistence garantit',
                        runtime_acceptance: [
                            {
                                id: 'preuve',
                                description: 'd',
                                proof: 'browser-coexistence',
                                status: 'harness-pending',
                            },
                        ],
                    },
                ],
            }),
            autre: validRecipe({ library: 'autre' }),
        },
    });
    assert.deepEqual(validateRecipes(acceptancesSeules).errors, []);
});

test('BYPASS : recette fournie par lien symbolique → rejetée', async (t) => {
    const root = await scaffold(t);
    const elsewhere = await mkdtemp(join(tmpdir(), 'cmz-elsewhere-'));
    t.after(() => rm(elsewhere, { recursive: true, force: true }));
    await write(join(elsewhere, 'evil.setup.json'), validRecipe());
    await link(
        join(elsewhere, 'evil.setup.json'),
        join(root, 'conventions/libraries/angular/demo.setup.json')
    );
    assert.ok(
        validateRecipes(root).errors.some((e) =>
            /lien symbolique \(interdit\)/.test(e)
        )
    );
});
