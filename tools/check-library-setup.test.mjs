import assert from 'node:assert/strict';
import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { validateRecipes, verifyAppLibraries } from './check-library-setup.mjs';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const SCHEMA = 'conventions/libraries/library-setup.schema.json';

async function write(path, content) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(
        path,
        typeof content === 'string'
            ? content
            : `${JSON.stringify(content, null, 2)}\n`
    );
}

/** Racine jetable qui contient le vrai schéma + les recettes qu'on lui donne. */
async function recipeRoot(t, recipes = {}) {
    const root = await mkdtemp(join(tmpdir(), 'cmz-library-setup-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    await mkdir(join(root, 'conventions/libraries'), { recursive: true });
    await copyFile(join(REPO_ROOT, SCHEMA), join(root, SCHEMA));
    for (const [stem, recipe] of Object.entries(recipes)) {
        await write(
            join(root, `conventions/libraries/${stem}.setup.json`),
            recipe
        );
    }
    return root;
}

function validRecipe(overrides = {}) {
    return {
        schema_version: '1.0.0',
        library: 'demo',
        platform: 'angular',
        packages: ['demo-pkg'],
        install: {
            method: 'llm-then-verified',
            notes: 'installé puis vérifié',
        },
        invariants: [
            {
                id: 'package',
                description: 'demo-pkg est déclaré',
                assert: {
                    file: 'package.json',
                    kind: 'file-contains',
                    value: 'demo-pkg',
                },
            },
        ],
        guidance: 'https://example.com/docs',
        ...overrides,
    };
}

// ─────────────────────────── validateRecipes ────────────────────────────

test('les recettes réelles du dépôt sont toutes valides', () => {
    const result = validateRecipes(REPO_ROOT);
    assert.deepEqual(result.errors, []);
    assert.equal(result.ok, true);
    assert.deepEqual([...result.recipes.keys()].sort(), [
        'angular-material',
        'tailwind',
        'transloco',
    ]);
});

test('aucune recette du tout est une erreur (fail-closed)', async (t) => {
    const root = await recipeRoot(t);
    const result = validateRecipes(root);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => /aucune recette/.test(e)));
});

test('schéma fermé : une clé de premier niveau inconnue est rejetée', async (t) => {
    const root = await recipeRoot(t, {
        demo: validRecipe({ extra: 'non prévu' }),
    });
    const result = validateRecipes(root);
    assert.equal(result.ok, false);
    assert.ok(
        result.errors.some((e) => /additional property is not allowed/.test(e))
    );
});

test('platform hors enum est rejeté par le schéma', async (t) => {
    const root = await recipeRoot(t, {
        demo: validRecipe({ platform: 'flutter' }),
    });
    const result = validateRecipes(root);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => /\$\.platform/.test(e)));
});

test('guidance non-https est rejetée', async (t) => {
    const root = await recipeRoot(t, {
        demo: validRecipe({ guidance: 'http://example.com/docs' }),
    });
    const result = validateRecipes(root);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => /\$\.guidance/.test(e)));
});

test('library doit égaler le nom de fichier', async (t) => {
    const root = await recipeRoot(t, {
        demo: validRecipe({ library: 'autre-chose' }),
    });
    const result = validateRecipes(root);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => /≠ nom de fichier/.test(e)));
});

test('deux invariants avec le même id sont rejetés', async (t) => {
    const root = await recipeRoot(t, {
        demo: validRecipe({
            invariants: [
                {
                    id: 'package',
                    description: 'a',
                    assert: { file: 'a.txt', kind: 'file-exists' },
                },
                {
                    id: 'package',
                    description: 'b',
                    assert: { file: 'b.txt', kind: 'file-exists' },
                },
            ],
        }),
    });
    const result = validateRecipes(root);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => /id dupliqué/.test(e)));
});

test('value est requis sauf pour file-exists', async (t) => {
    const root = await recipeRoot(t, {
        demo: validRecipe({
            invariants: [
                {
                    id: 'sans-valeur',
                    description: 'file-contains sans value',
                    assert: { file: 'package.json', kind: 'file-contains' },
                },
            ],
        }),
    });
    const result = validateRecipes(root);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => /"value" requis/.test(e)));
});

test('une regex file-matches invalide est signalée', async (t) => {
    const root = await recipeRoot(t, {
        demo: validRecipe({
            invariants: [
                {
                    id: 'regex-cassee',
                    description: 'parenthèse non fermée',
                    assert: {
                        file: 'src/styles.scss',
                        kind: 'file-matches',
                        value: 'mat\\.theme\\(',
                    },
                },
                {
                    id: 'regex-cassee-2',
                    description: 'vraiment cassée',
                    assert: {
                        file: 'x.txt',
                        kind: 'file-matches',
                        value: '([a-z',
                    },
                },
            ],
        }),
    });
    const result = validateRecipes(root);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => /regex invalide/.test(e)));
});

test('official-schematic sans command est rejeté', async (t) => {
    const root = await recipeRoot(t, {
        demo: validRecipe({
            install: { method: 'official-schematic', notes: 'x' },
        }),
    });
    const result = validateRecipes(root);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => /exige "command"/.test(e)));
});

test('reference-derived sans reference_tool est rejeté', async (t) => {
    const root = await recipeRoot(t, {
        demo: validRecipe({
            install: { method: 'reference-derived', notes: 'x' },
        }),
    });
    const result = validateRecipes(root);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => /exige "reference_tool"/.test(e)));
});

test('coexistence.with sans recette correspondante est rejetée', async (t) => {
    const root = await recipeRoot(t, {
        demo: validRecipe({
            coexistence: [
                {
                    with: 'fantome',
                    invariants: [
                        {
                            id: 'x',
                            description: 'x',
                            assert: { file: 'a.txt', kind: 'file-exists' },
                        },
                    ],
                },
            ],
        }),
    });
    const result = validateRecipes(root);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => /n'a pas de recette/.test(e)));
});

test('coexistence avec soi-même est rejetée', async (t) => {
    const root = await recipeRoot(t, {
        demo: validRecipe({
            coexistence: [
                {
                    with: 'demo',
                    invariants: [
                        {
                            id: 'x',
                            description: 'x',
                            assert: { file: 'a.txt', kind: 'file-exists' },
                        },
                    ],
                },
            ],
        }),
    });
    const result = validateRecipes(root);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => /coexistence avec elle-même/.test(e)));
});

test('assert.file avec un segment `..` est rejeté par le schéma', async (t) => {
    const root = await recipeRoot(t, {
        demo: validRecipe({
            invariants: [
                {
                    id: 'traversee',
                    description: 'tente de sortir',
                    assert: {
                        file: '../../../etc/passwd',
                        kind: 'file-exists',
                    },
                },
            ],
        }),
    });
    const result = validateRecipes(root);
    assert.equal(result.ok, false);
    assert.ok(
        result.errors.some((e) => /assert\.file: does not match/.test(e))
    );
});

test('assert.file accepte un dotfile à la racine de l’app', async (t) => {
    const root = await recipeRoot(t, {
        demo: validRecipe({
            invariants: [
                {
                    id: 'postcss',
                    description: '.postcssrc.json présent',
                    assert: { file: '.postcssrc.json', kind: 'file-exists' },
                },
            ],
        }),
    });
    const result = validateRecipes(root);
    assert.deepEqual(result.errors, []);
});

// ────────────────────────── verifyAppLibraries ──────────────────────────

async function appRoot(t, { libraries, files = {} }) {
    const root = await mkdtemp(join(tmpdir(), 'cmz-app-libraries-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    await write(join(root, 'apps/demo-app/.cmz/libraries.json'), {
        schema_version: '1.0.0',
        kind: 'app-library-manifest',
        libraries,
    });
    for (const [rel, content] of Object.entries(files)) {
        await write(join(root, 'apps/demo-app', rel), content);
    }
    return root;
}

test('un invariant satisfait dans l’arbre de l’app passe', async (t) => {
    const root = await appRoot(t, {
        libraries: ['demo'],
        files: {
            'package.json': '{ "dependencies": { "demo-pkg": "1.0.0" } }',
        },
    });
    const result = verifyAppLibraries(root, new Map([['demo', validRecipe()]]));
    assert.deepEqual(result.errors, []);
    assert.equal(result.checkedApps, 1);
});

test('un invariant non satisfait fait échouer la gate', async (t) => {
    const root = await appRoot(t, {
        libraries: ['demo'],
        files: { 'package.json': '{ "dependencies": {} }' },
    });
    const result = verifyAppLibraries(root, new Map([['demo', validRecipe()]]));
    assert.equal(result.ok, false);
    assert.ok(
        result.errors.some((e) => /\[demo\/package\] .*ne contient pas/.test(e))
    );
});

test('un manifeste d’app mal formé est rejeté', async (t) => {
    const root = await mkdtemp(join(tmpdir(), 'cmz-app-libraries-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    await write(join(root, 'apps/demo-app/.cmz/libraries.json'), {
        schema_version: '1.0.0',
        kind: 'mauvais-kind',
        libraries: [],
    });
    const result = verifyAppLibraries(root, new Map([['demo', validRecipe()]]));
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => /forme invalide/.test(e)));
});

test('une app qui déclare une bibliothèque sans recette échoue', async (t) => {
    const root = await appRoot(t, { libraries: ['inconnue'] });
    const result = verifyAppLibraries(root, new Map([['demo', validRecipe()]]));
    assert.equal(result.ok, false);
    assert.ok(
        result.errors.some((e) => /"inconnue" n'a pas de recette/.test(e))
    );
});

test('les invariants de coexistence ne sont vérifiés que si les deux sont déclarées', async (t) => {
    const paired = validRecipe({
        library: 'demo',
        coexistence: [
            {
                with: 'autre',
                invariants: [
                    {
                        id: 'frontiere',
                        description: 'styles.scss documente la frontière',
                        assert: {
                            file: 'src/styles.scss',
                            kind: 'file-contains',
                            value: 'FRONTIERE',
                        },
                    },
                ],
            },
        ],
    });
    const other = validRecipe({ library: 'autre', packages: ['autre-pkg'] });
    const recipes = new Map([
        ['demo', paired],
        ['autre', other],
    ]);

    const soloFiles = {
        'package.json': '{ "dependencies": { "demo-pkg": "1.0.0" } }',
    };
    const solo = await appRoot(t, { libraries: ['demo'], files: soloFiles });
    assert.deepEqual(verifyAppLibraries(solo, recipes).errors, []);

    const bothFiles = {
        'package.json':
            '{ "dependencies": { "demo-pkg": "1", "autre-pkg": "1" } }',
        'src/styles.scss': '/* pas de frontiere documentee */',
    };
    const both = await appRoot(t, {
        libraries: ['demo', 'autre'],
        files: bothFiles,
    });
    const result = verifyAppLibraries(both, recipes);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => /\[demo\+autre\/frontiere\]/.test(e)));
});

test('file-not-contains passe quand le fichier est absent', async (t) => {
    const recipe = validRecipe({
        invariants: [
            {
                id: 'pas-de-port',
                description: 'aucune abstraction maison',
                assert: {
                    file: 'src/app/app.config.ts',
                    kind: 'file-not-contains',
                    value: 'TranslationPort',
                },
            },
        ],
    });
    const root = await appRoot(t, { libraries: ['demo'] });
    assert.deepEqual(
        verifyAppLibraries(root, new Map([['demo', recipe]])).errors,
        []
    );
});

test('runtime : un assert.file qui échappe la racine de l’app est bloqué même si le schéma est contourné', async (t) => {
    // Recette fabriquée à la main : simule une recette qui aurait échappé à la
    // validation de schéma. La garde de confinement de runAssertion doit tenir.
    const evil = {
        ...validRecipe(),
        invariants: [
            {
                id: 'traversee',
                description: 'pointe hors de l’app',
                assert: { file: '../../secret.txt', kind: 'file-exists' },
            },
        ],
    };
    const root = await appRoot(t, { libraries: ['demo'] });
    await write(join(root, 'secret.txt'), 'donnée hors app');
    const result = verifyAppLibraries(root, new Map([['demo', evil]]));
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => /échappe la racine de l'app/.test(e)));
});

test('0 app déclarante = 0 app vérifiée, sans erreur', async (t) => {
    const root = await mkdtemp(join(tmpdir(), 'cmz-app-libraries-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    await mkdir(join(root, 'apps'), { recursive: true });
    const result = verifyAppLibraries(root, new Map([['demo', validRecipe()]]));
    assert.deepEqual(result.errors, []);
    assert.equal(result.checkedApps, 0);
});
