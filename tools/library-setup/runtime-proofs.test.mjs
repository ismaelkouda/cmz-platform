import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';

import postcss from 'postcss';

import {
    assertBrowserCoexistence,
    assertMaterialTailwindCascade,
    browserProbeHtml,
    proveLibraryRuntime,
    requiredAcceptances,
} from './runtime-proofs.mjs';

// Forme réellement observée sur un candidat après `ng-add` : les jetons dans
// une règle `html` hors couche, le preflight confiné dans `@layer base`.
const MATERIAL_TOKENS_UNLAYERED =
    'html{--mat-sys-primary:#005cbb;--mat-sys-surface:#fff}';
const TAILWIND_PREFLIGHT_LAYERED =
    '@layer base{button,[type="button"]{background-color:transparent;border:0}}';

async function put(root, path, content) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), content);
}

test('Tailwind exige une vraie règle CSS issue du build et nettoie sa sonde', async (t) => {
    const root = await realpath(
        await mkdtemp(join(tmpdir(), 'cmz-runtime-proof-'))
    );
    t.after(() => rm(root, { recursive: true, force: true }));
    const workspace = join(root, 'candidate');
    for (const path of ['candidate', 'repo', 'cache', 'home'])
        await mkdir(join(root, path));
    await mkdir(join(workspace, 'apps/demo/src'), { recursive: true });
    await put(
        root,
        'candidate/apps/demo/project.json',
        JSON.stringify({
            targets: { build: { options: { outputPath: 'dist/apps/demo' } } },
        })
    );
    let builds = 0;
    const result = proveLibraryRuntime({
        repository: join(root, 'repo'),
        candidate: { workspace },
        recipe: {
            platform: 'angular',
            library: 'tailwind',
            runtime_acceptance: [{ id: 'sentinel-class-emits-rule' }],
        },
        app: 'demo',
        policy: {},
        backend: 'test',
        cache: join(root, 'cache'),
        home: join(root, 'home'),
        run: ({ argv }) => {
            if (argv.includes('demo:build:development')) {
                builds += 1;
                const output = join(workspace, 'dist/apps/demo');
                mkdirSync(output, { recursive: true });
                writeFileSync(
                    join(output, 'styles.css'),
                    '.text\\-\\[\\#123456\\]{color:#123456}'
                );
            }
            return { status: 0, stdout: '', stderr: '' };
        },
    });
    assert.deepEqual(result.proofs, ['sentinel-class-emits-rule']);
    assert.equal(builds, 2);
});

// L'enjeu de la coexistence n'est pas « les deux CSS sont là » : une couche
// perd toujours contre du CSS hors couche. Le preflight Tailwind doit donc être
// dans `@layer`, et les règles Material hors couche. Les quatre combinaisons
// sont exercées, y compris les deux qui doivent échouer.
test('la cascade Material/Tailwind est jugée sur la relation de couche', () => {
    assert.deepEqual(
        assertMaterialTailwindCascade(
            `${TAILWIND_PREFLIGHT_LAYERED}${MATERIAL_TOKENS_UNLAYERED}`,
            postcss.parse
        ),
        { resets: 1, tokenRules: 1, unlayeredTokenRules: 1 }
    );

    assert.throws(
        () =>
            assertMaterialTailwindCascade(
                `button{border:0}${MATERIAL_TOKENS_UNLAYERED}`,
                postcss.parse
            ),
        /preflight Tailwind hors couche/
    );

    assert.throws(
        () =>
            assertMaterialTailwindCascade(
                `${TAILWIND_PREFLIGHT_LAYERED}@layer components{${MATERIAL_TOKENS_UNLAYERED}}`,
                postcss.parse
            ),
        /jetons --mat-\* uniquement dans une couche/
    );

    assert.throws(
        () =>
            assertMaterialTailwindCascade(
                TAILWIND_PREFLIGHT_LAYERED,
                postcss.parse
            ),
        /CSS compilé incomplet/
    );

    // `.mat-mdc-button button` n'est pas un reset : il porte une classe. Et une
    // simple mention de `--mat-` en valeur ne compte pas : seule une
    // DÉCLARATION de jeton compte.
    assert.throws(
        () =>
            assertMaterialTailwindCascade(
                '.mat-mdc-button button{border:0;color:var(--mat-sys-primary)}',
                postcss.parse
            ),
        /CSS compilé incomplet \(preflight Tailwind=0/
    );
});

test('les acceptances exécutées viennent de la recette, jamais d’une règle codée', () => {
    const recipe = {
        platform: 'angular',
        library: 'angular-material',
        runtime_acceptance: [{ id: 'material-component-compiles' }],
        coexistence: [
            {
                with: 'tailwind',
                runtime_acceptance: [
                    { id: 'material-tailwind-cascade-order' },
                    { id: 'material-tailwind-render-together' },
                ],
            },
        ],
    };
    const registry = new Map([
        ['angular/angular-material', recipe],
        [
            'angular/tailwind',
            {
                platform: 'angular',
                library: 'tailwind',
                runtime_acceptance: [],
            },
        ],
    ]);
    assert.deepEqual(
        requiredAcceptances(recipe, []).map(({ id }) => id),
        ['material-component-compiles']
    );
    assert.deepEqual(
        requiredAcceptances(recipe, ['tailwind'], registry).map(
            ({ id, scope }) => `${id}@${scope}`
        ),
        [
            'material-component-compiles@library',
            'material-tailwind-cascade-order@coexistence:tailwind',
            'material-tailwind-render-together@coexistence:tailwind',
        ]
    );
    // Retirer le bloc de la recette retire l'exigence : c'est ce que l'ancienne
    // règle codée en dur ne faisait pas.
    assert.deepEqual(
        requiredAcceptances(
            { ...recipe, coexistence: [] },
            ['tailwind'],
            registry
        ).map(({ id }) => id),
        ['material-component-compiles']
    );
});

test('la coexistence est exigée quel que soit l’ordre d’installation', () => {
    const material = {
        platform: 'angular',
        library: 'angular-material',
        runtime_acceptance: [{ id: 'material-component-compiles' }],
        coexistence: [
            {
                with: 'tailwind',
                runtime_acceptance: [
                    { id: 'material-tailwind-render-together' },
                ],
            },
        ],
    };
    const tailwind = {
        platform: 'angular',
        library: 'tailwind',
        runtime_acceptance: [{ id: 'sentinel-class-emits-rule' }],
    };
    const recipes = new Map([
        ['angular/angular-material', material],
        ['angular/tailwind', tailwind],
    ]);
    assert.deepEqual(
        requiredAcceptances(tailwind, ['angular-material'], recipes).map(
            ({ ownerLibrary, id }) => `${ownerLibrary}#${id}`
        ),
        [
            'tailwind#sentinel-class-emits-rule',
            'angular-material#material-tailwind-render-together',
        ]
    );
    assert.throws(
        () => requiredAcceptances(tailwind, ['bibliotheque-inconnue'], recipes),
        /recette installée absente/
    );
});

test('une acceptance déclarée sans oracle bloque en nommant la clé', async (t) => {
    const root = await realpath(
        await mkdtemp(join(tmpdir(), 'cmz-runtime-oracle-'))
    );
    t.after(() => rm(root, { recursive: true, force: true }));
    const workspace = join(root, 'candidate');
    for (const path of ['candidate', 'repo', 'cache', 'home'])
        await mkdir(join(root, path));
    await mkdir(join(workspace, 'apps/demo/src'), { recursive: true });
    await put(
        root,
        'candidate/apps/demo/project.json',
        JSON.stringify({
            targets: { build: { options: { outputPath: 'dist/apps/demo' } } },
        })
    );
    assert.throws(
        () =>
            proveLibraryRuntime({
                repository: join(root, 'repo'),
                candidate: { workspace },
                recipe: {
                    platform: 'angular',
                    library: 'angular-material',
                    runtime_acceptance: [
                        {
                            id: 'preuve-jamais-livree',
                            proof: 'compile-component',
                        },
                    ],
                },
                app: 'demo',
                policy: {},
                backend: 'test',
                cache: join(root, 'cache'),
                home: join(root, 'home'),
                run: ({ argv }) => {
                    if (argv.includes('demo:build:development')) {
                        mkdirSync(join(workspace, 'dist/apps/demo'), {
                            recursive: true,
                        });
                    }
                    return { status: 0, stdout: '', stderr: '' };
                },
            }),
        /oracle runtime absent pour angular\/angular-material#preuve-jamais-livree/
    );
});

// L'oracle navigateur lit les styles CALCULÉS renvoyés par le moteur. Les
// quatre échecs possibles sont exercés : sonde muette, aucun jeton, preflight
// qui écrase une règle hors couche (le vrai risque de coexistence), utilitaire
// Tailwind devenue inopérante.
test('l’oracle navigateur juge des styles calculés, pas du texte CSS', () => {
    const dump = (value) =>
        `<html><body><pre id="cmz-result">${JSON.stringify(value)}</pre></body></html>`;
    const bon = {
        tokenCount: 168,
        tokenResolved: 'rgb(0, 92, 187)',
        unlayeredBorderWidth: '7px',
        utilityColor: 'rgb(18, 52, 86)',
    };
    assert.deepEqual(assertBrowserCoexistence(dump(bon)), bon);

    assert.throws(
        () => assertBrowserCoexistence('<html><body>rien</body></html>'),
        /aucun résultat exploitable/
    );
    assert.throws(
        () => assertBrowserCoexistence(dump({ ...bon, tokenCount: 0 })),
        /aucun jeton --mat-\*/
    );
    assert.throws(
        () => assertBrowserCoexistence(dump({ ...bon, tokenResolved: '' })),
        /ne résout aucun jeton/
    );
    assert.throws(
        () =>
            assertBrowserCoexistence(
                dump({ ...bon, unlayeredBorderWidth: '0px' })
            ),
        /écrase une règle hors couche/
    );
    assert.throws(
        () =>
            assertBrowserCoexistence(
                dump({ ...bon, utilityColor: 'rgb(0, 0, 0)' })
            ),
        /utilitaire Tailwind ne s’applique plus|utilitaire Tailwind ne s'applique plus/
    );
});

test('la page sonde intègre le CSS compilé et n’appelle aucun réseau', () => {
    const html = browserProbeHtml(
        `${TAILWIND_PREFLIGHT_LAYERED}${MATERIAL_TOKENS_UNLAYERED}`
    );
    // Intégré, pas lié : en `file://` Chrome refuse d'énumérer les règles d'une
    // feuille externe, ce qui rendait la sonde aveugle aux jetons (mesuré).
    assert.doesNotMatch(html, /<link/);
    assert.match(html, /--mat-sys-primary/);
    assert.match(html, /@layer base/);
    assert.match(html, /id="cmz-result"/);
    assert.doesNotMatch(html, /https?:\/\//);
    assert.doesNotMatch(html, /fetch\(|XMLHttpRequest|WebSocket/);
    assert.throws(() => browserProbeHtml(''), /aucun CSS compilé/);
    assert.throws(
        () => browserProbeHtml('a{}</style><script>x()</script>'),
        /fermeture de balise style/
    );
});
