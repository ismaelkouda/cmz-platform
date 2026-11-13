// CI #389, « T2 décodé » (défaut relevé par le tiers aveugle sur absent_text,
// confirmé par rejeu du pilote) : T2 porte sur les valeurs qu'Angular DÉCODE,
// pas seulement sur la source. Chaque forme du rapport est rejouée sur
// l'accepteur réel, dans la page Connexion acceptée.
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    grammarFixture,
    insertAt,
} from './test-support/page-grammar-fixture.mjs';

const HTML = 'page.component.html';

const PROBES = [
    [
        'entité Cf dans un texte',
        '<h1 data-cmz-id="report-heading">',
        'a&#x202E;b',
        /decoded text carries an invisible or control character U\+202E \(format\)/,
    ],
    [
        'entité de largeur nulle dans un texte',
        '<h1 data-cmz-id="report-heading">',
        'a&#8203;b',
        /decoded text carries an invisible or control character U\+200B \(format\)/,
    ],
    [
        'entité dans un attribut statique',
        'aria-label="Report',
        '&#x202E;',
        /decoded attribute carries an invisible or control character U\+202E \(format\)/,
    ],
    [
        'entité dans un littéral d’interpolation',
        '{{ announcement()',
        " ?? 'a&#x202E;b'",
        /decoded string literal carries an invisible or control character U\+202E \(format\)/,
    ],
    [
        'échappement \\u dans un littéral d’interpolation',
        '{{ announcement()',
        " ?? 'a\\u202Eb'",
        /decoded string literal carries an invisible or control character U\+202E \(format\)/,
    ],
    [
        'barre oblique inverse dans un littéral',
        '{{ announcement()',
        " ?? 'a\\tb'",
        /template string literal contains a backslash/,
    ],
];

test('T2 décodé : la page acceptée reste acceptée ; chaque forme décodée est refusée, nommée', async (t) => {
    const fixture = await grammarFixture(t, 'observatory');
    assert.deepEqual(fixture.violations(fixture.adapted), []);
    for (const [label, anchor, inserted, message] of PROBES) {
        const { files, interval } = insertAt(
            fixture.adapted,
            HTML,
            anchor,
            inserted
        );
        const found = fixture.findings(files).filter(
            (entry) =>
                entry.code === 'T2' &&
                entry.file === interval.file &&
                // Une valeur décodée se localise par son nœud : le
                // refus doit chevaucher le texte inséré.
                entry.start <= interval.end &&
                entry.end >= interval.start
        );
        assert.ok(
            found.some((entry) => message.test(entry.message)),
            `${label} : ${JSON.stringify(found.map((entry) => entry.message))}`
        );
    }
});

// CI #389, V-T2-7 (E) : un cas par contexte d'expression parcouru, pour que
// retirer l'un d'eux fasse rougir ce test (mutants X1 à X9 de E).
const STRING_LITERAL =
    /decoded string literal carries an invisible or control character U\+202E \(format\)/;
const CONTEXTS = [
    [
        'X1 liaison [attr]',
        `[attr.aria-invalid]="fieldErrors()['identity'] ? true : null`,
        " ?? 'a\\u202Eb'",
        STRING_LITERAL,
    ],
    [
        'X2 gestionnaire (événement)',
        `(input)="edit('identity'`,
        " + 'a\\u202Eb'",
        STRING_LITERAL,
    ],
    [
        'X3 garde @if',
        '<div class="status">\n',
        "        @if (state() === 'a\\u202Eb') {\n            <p>x</p>\n        }\n",
        STRING_LITERAL,
    ],
    [
        'X4 expression @switch',
        '@switch (state()',
        " ?? 'a\\u202Eb'",
        STRING_LITERAL,
    ],
    [
        'X5 expression @case',
        "@case ('ready'",
        " ?? 'a\\u202Eb'",
        STRING_LITERAL,
    ],
    [
        'X6 expression @for',
        "@for (message of fieldErrors()['identity'] ?? []",
        " ?? ['a\\u202Eb']",
        STRING_LITERAL,
    ],
    [
        'X7 @let',
        '<div class="status">\n',
        "        @let probe = 'a\\u202Eb';\n",
        STRING_LITERAL,
    ],
    [
        'X8 gabarit de chaîne, valeur décodée',
        '{{ announcement()',
        ' ?? `a\\u202Eb`',
        /decoded template literal carries an invisible or control character U\+202E \(format\)/,
    ],
    [
        'X9 gabarit de chaîne, barre oblique',
        '{{ announcement()',
        ' ?? `a\\\\b`',
        /template string literal contains a backslash/,
    ],
];

test('T2 décodé par contexte : liaison, événement, @if, @switch, @case, @for, @let, gabarit de chaîne', async (t) => {
    const fixture = await grammarFixture(t, 'observatory');
    for (const [label, anchor, inserted, message] of CONTEXTS) {
        const { files, interval } = insertAt(
            fixture.adapted,
            HTML,
            anchor,
            inserted
        );
        const found = fixture
            .findings(files)
            .filter(
                (entry) =>
                    entry.code === 'T2' &&
                    entry.file === interval.file &&
                    entry.start <= interval.end &&
                    entry.end >= interval.start
            );
        assert.ok(
            found.some((entry) => message.test(entry.message)),
            `${label} : ${JSON.stringify(found.map((entry) => entry.message))}`
        );
    }
});

// O-C5-2 : `content` fabrique du texte hors du gabarit ; refusé dans la feuille
// compilée et PUBLIÉ dans la grammaire du bon de travail.
test('O-C5-2 : la propriété CSS content est refusée et publiée', async (t) => {
    const fixture = await grammarFixture(t, 'observatory');
    assert.deepEqual(fixture.workOrder.grammar.style.refused_properties, [
        'content',
    ]);
    const { files } = insertAt(
        fixture.adapted,
        'page.component.scss',
        '    max-width: 28rem;\n',
        "    content: 'x';\n"
    );
    assert.ok(
        fixture
            .findings(files)
            .some(
                (entry) =>
                    entry.code === 'C0' &&
                    /CSS property content is not allowed/.test(entry.message)
            ),
        JSON.stringify(fixture.violations(files))
    );
});

// B-T2-1 (Fable, sonde du pilote) : css-tree rend le nom de propriété BRUT,
// échappement compris. Un identifiant échappé est refusé dans tout le CSS
// compilé ; la règle est publiée. Les listes de règles @ et de fonctions
// permises y résistaient déjà : un nom échappé n'y figure pas.
test('B-T2-1 : un identifiant CSS échappé est refusé ; content refusé en toute casse ; témoin accepté', async (t) => {
    const fixture = await grammarFixture(t, 'observatory');
    assert.equal(fixture.workOrder.grammar.style.identifier_escapes, 'refused');
    const declare = (declaration) =>
        fixture.findings(
            insertAt(
                fixture.adapted,
                'page.component.scss',
                '    max-width: 28rem;\n',
                `    ${declaration}\n`
            ).files
        );
    for (const declaration of [
        "\\63 ontent: 'x';",
        "cont\\65 nt: 'x';",
        "\\000063ontent: 'x';",
        "\\content: 'x';",
    ])
        assert.ok(
            declare(declaration).some(
                (entry) =>
                    entry.code === 'C0' &&
                    /CSS identifier escape is not allowed/.test(entry.message)
            ),
            declaration
        );
    for (const declaration of ["content: 'x';", "CONTENT: 'x';"])
        assert.ok(
            declare(declaration).some(
                (entry) =>
                    entry.code === 'C0' &&
                    /CSS property content is not allowed/i.test(entry.message)
            ),
            declaration
        );
    assert.deepEqual(declare('color: red;'), []);
});

// Réserve Y3 (E) : échappement dans un jeton autre qu'Ident. Mesure : Sass
// GARDE l'échappement d'une dimension et d'une règle @ inconnue (refus C0
// sur le texte inséré, ce qui tue le mutant « garde réduite à Ident ») ; il
// DÉCODE celui d'un #hash et d'une fonction, puis la grammaire juge
// l'identifiant décodé (`\75 rl(` devient `url(`, refusé C3).
test('Y3 : échappement d’identifiant dans une dimension et une règle @, refusé sur le jeton inséré ; hash et fonction décodés par Sass', async (t) => {
    const fixture = await grammarFixture(t, 'observatory');
    const S = 'page.component.scss';
    const declare = (text) =>
        insertAt(fixture.adapted, S, '    max-width: 28rem;\n', text);
    const append = (text) => ({
        files: { ...fixture.adapted, [S]: fixture.adapted[S] + text },
        interval: {
            file: S,
            start: fixture.adapted[S].length,
            end: fixture.adapted[S].length + text.length,
        },
    });
    const onInsert = ({ files, interval }, code, message) =>
        fixture
            .findings(files)
            .some(
                (entry) =>
                    entry.code === code &&
                    message.test(entry.message) &&
                    entry.file === interval.file &&
                    entry.start >= interval.start &&
                    entry.start < interval.end
            );
    for (const [label, inserted] of [
        ['dimension 10px\\9', declare('    width: 10px\\9;\n')],
        ['dimension 1\\2e 5em', declare('    width: 1\\2e 5em;\n')],
        ['règle @\\66 oo', append('@\\66 oo bar;\n')],
    ])
        assert.ok(
            onInsert(inserted, 'C0', /CSS identifier escape is not allowed/),
            label
        );
    // Fonction : décodée par Sass, puis refusée par la liste fermée (url).
    assert.ok(
        onInsert(
            declare('    width: \\75 rl(x);\n'),
            'C3',
            /CSS token url-token is not allowed/
        )
    );
    // #hash : décodé par Sass (`#A`), aucun échappement ne subsiste.
    assert.deepEqual(
        fixture.findings(append('#\\41 {\n    color: red;\n}\n').files),
        []
    );
});
