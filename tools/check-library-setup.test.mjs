import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { mkdtemp, realpath, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';

import { validateRecipes } from './check-library-setup.mjs';
import { executeLibraryRecipe } from './library-setup/recipe-execution.mjs';
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
        'react/tailwind',
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

test('une ancienne recette llm-then-verified est refusée explicitement', async (t) => {
    const root = await scaffold(t, {
        recipes: {
            demo: validRecipe({
                install: {
                    method: 'llm-then-verified',
                    prompt_contract:
                        'Configure uniquement les chemins autorisés.',
                    llm_write_paths: ['src/config.ts'],
                    max_iterations: 3,
                    iteration_timeout_ms: 120000,
                    max_context_bytes: 262144,
                    max_response_bytes: 65536,
                    notes: 'ancienne recette',
                },
            }),
        },
    });
    const errors = validateRecipes(root).errors;
    assert.ok(
        errors.some((error) => /llm-then-verified.*a été retiré/.test(error))
    );
    assert.ok(
        errors.some((error) => /fournisseur réel et un nouvel ADR/.test(error))
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
    assert.deepEqual(
        material.runtime_acceptance.map(
            (entry) => `${entry.id}:${entry.proof}:${entry.status}`
        ),
        [
            'material-component-compiles:compile-component:enforced',
            'material-preserves-host-typography:browser-style-preservation:enforced',
            'offline-production-build:production-build:enforced',
        ]
    );
    assert.equal(
        material.runtime_acceptance.find(
            (entry) => entry.id === 'material-component-compiles'
        ).status,
        'enforced'
    );
    assert.deepEqual(
        material.install.normalizations.filter(
            (entry) => entry.file === 'src/styles.scss'
        ),
        [
            {
                kind: 'exact-replacement',
                file: 'src/styles.scss',
                search: 'typography: Roboto,',
                replacement:
                    'typography: (plain-family: system-ui, brand-family: system-ui),',
                occurrences: 1,
            },
            {
                kind: 'exact-replacement',
                file: 'src/styles.scss',
                search: '  font: var(--mat-sys-body-medium);',
                replacement: '',
                occurrences: 1,
            },
        ]
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

test('normalise la sortie réelle du schematic Material et refuse sa dérive', async (t) => {
    const require = createRequire(import.meta.url);
    const materialRoot = dirname(
        require.resolve('@angular/material/package.json')
    );
    const materialPackage = JSON.parse(
        readFileSync(join(materialRoot, 'package.json'), 'utf8')
    );
    const { createTheme } = require(
        join(materialRoot, 'schematics/ng-add/theming/create-theme.js')
    );
    const recipes = validateRecipes(REPO_ROOT);
    assert.equal(recipes.ok, true, recipes.errors.join(' ; '));
    const recipe = recipes.recipes.get('angular/angular-material');
    const track = JSON.parse(
        readFileSync(
            join(
                REPO_ROOT,
                'conventions/libraries/angular/angular-material.compat.json'
            ),
            'utf8'
        )
    ).tracks[0];
    assert.equal(
        materialPackage.version,
        track.packages['@angular/material'],
        'le générateur observé doit être la version de la piste candidate'
    );
    const vendorTheme = createTheme('azure-blue');
    const fontNormalization = recipe.install.normalizations.find((entry) =>
        entry.search.includes('mat-sys-body-medium')
    );
    assert.equal(
        vendorTheme.split(fontNormalization.search).length - 1,
        1,
        'la sortie vendeur doit contenir exactement la forme normalisée'
    );

    const runRecipe = async (theme) => {
        const root = await realpath(
            await mkdtemp(join(tmpdir(), 'cmz-material-vendor-'))
        );
        t.after(() => rm(root, { recursive: true, force: true }));
        const workspace = join(root, 'candidate');
        const put = (path, content) => {
            const absolute = join(workspace, path);
            mkdirSync(dirname(absolute), { recursive: true });
            writeFileSync(absolute, content);
        };
        for (const path of ['repo', 'cache', 'home']) {
            mkdirSync(join(root, path));
        }
        put('apps/demo/project.json', '{"name":"demo"}\n');
        put(
            'apps/demo/.cmz/libraries.json',
            '{"schema_version":"1.0.0","kind":"app-library-manifest","platform":"angular","libraries":[]}\n'
        );
        const indexLinks = recipe.install.normalizations
            .filter((entry) => entry.file === 'src/index.html')
            .map((entry) => `  ${entry.search}`)
            .join('\n');
        put(
            'apps/demo/src/index.html',
            `<html><head>\n${indexLinks}\n</head><body></body></html>\n`
        );
        put('apps/demo/src/styles.scss', 'body { color: navy; }\n');
        put('node_modules/nx/dist/bin/nx.js', '');
        put('node_modules/prettier/bin/prettier.cjs', '');
        const styles = join(workspace, 'apps/demo/src/styles.scss');
        executeLibraryRecipe({
            repository: join(root, 'repo'),
            candidate: { workspace },
            recipe,
            track,
            app: 'demo',
            policy: {},
            backend: 'test',
            cache: join(root, 'cache'),
            home: join(root, 'home'),
            run: ({ argv }) => {
                if (argv[0] === 'node_modules/nx/dist/bin/nx.js') {
                    writeFileSync(
                        styles,
                        `${theme}${readFileSync(styles, 'utf8')}`
                    );
                }
                return { status: 0, stdout: '', stderr: '' };
            },
        });
        return readFileSync(styles, 'utf8');
    };

    const normalized = await runRecipe(vendorTheme);
    assert.doesNotMatch(normalized, /font:\s*var\(--mat-sys-body-medium\)/);
    assert.match(normalized, /body \{ color: navy; \}/);

    const drifted = vendorTheme.replace(
        fontNormalization.search,
        '  font : var(--mat-sys-body-medium);'
    );
    await assert.rejects(
        () => runRecipe(drifted),
        /normalisation attend 1 occurrence\(s\), 0 trouvée\(s\)/
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
