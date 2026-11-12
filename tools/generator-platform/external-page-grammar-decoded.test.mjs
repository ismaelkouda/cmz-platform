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
