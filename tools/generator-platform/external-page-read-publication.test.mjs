// X5 C5b, B-C5b-pub (Fable) : `read_states.rules` est le contrat lu par l'IA ;
// il nomme EXACTEMENT ce que le code refuse. Les listes viennent des
// constantes de l'enforcement ; chaque forme listée est refusée pour de vrai.
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    ONLINE_ACCESS,
    READ_ACCESS_SUFFIXES,
    READ_HIDING,
    READ_OFFLINE_PLACEMENT,
    READ_PAGE_RULES,
    READ_PLACEMENTS,
    readHidingForms,
} from './core/read-access.mjs';
import {
    CELL,
    ERROR,
    H,
    readGrammarFixture,
    refusedAt,
    swap,
} from './test-support/read-page-grammar-fixture.mjs';

// Formes STRUCTURELLES (chemins de code, pas de constante) : épinglées ici.
const STRUCTURAL = {
    LE1: [
        'alias',
        'destructuring',
        'this[...]',
        'index',
        'argument',
        'whole node',
        'no other use',
    ],
    LE2: [
        '@if/@else if',
        '@switch/@case',
        'nested or sibling',
        'renders text',
        '@default',
        'final @else',
        'inside a branch',
    ],
    LE3: ["=== 'success'", '||', '@case group'],
    LE4: [
        '===',
        'string literal',
        '@switch expression',
        '!',
        '!==',
        '!=',
        'ternary',
        'interpolation',
        'binding',
        '@let',
        'argument',
    ],
    LE5: [
        '@for',
        'nearest governing guard',
        '.length',
        'field by field',
        'row?.f',
        'indexed',
        'whole',
        '@let',
    ],
    LE6: ['=== false', 'exactly one', 'nowhere else'],
    A1: ['protected computed', 'absentText'],
    A2: [
        '??',
        'optional pipe',
        '=== null',
        '=== undefined',
        '@else',
        'text interpolation',
        'empty string is not absent',
    ],
    A3: ['text', 'attribute', 'string literal', 'decoded'],
    A4: ['ancestor', 'contains it'],
};

test('B-C5b-pub : chaque règle publiée nomme chaque forme refusée', () => {
    assert.deepEqual(Object.keys(READ_PAGE_RULES), Object.keys(STRUCTURAL));
    for (const [rule, words] of Object.entries(STRUCTURAL))
        for (const word of words)
            assert.ok(
                READ_PAGE_RULES[rule].includes(word),
                `${rule} : ${word}`
            );
    // Listes de l'enforcement : masquage (A4, LE2), emplacements (LE2, LE6),
    // suffixes et accès hors ligne (LE1).
    // Attendu dérivé de READ_HIDING ICI, indépendamment de readHidingForms.
    const expected = [
        ...READ_HIDING.metadata,
        ...READ_HIDING.attributes,
        ...READ_HIDING.propertyBindings.map((name) => `[${name}]`),
        ...READ_HIDING.attributeBindings.map((name) => `[attr.${name}]`),
        '[style.*]',
    ];
    assert.equal(READ_HIDING.styleBindings, 'any');
    assert.deepEqual(readHidingForms(), expected);
    for (const form of expected) {
        assert.ok(READ_PAGE_RULES.A4.includes(form), `A4 : ${form}`);
        assert.ok(READ_PAGE_RULES.LE2.includes(form), `LE2 : ${form}`);
    }
    for (const label of Object.values(READ_PLACEMENTS))
        assert.ok(READ_PAGE_RULES.LE2.includes(label), `LE2 : ${label}`);
    assert.ok(
        READ_PAGE_RULES.LE6.includes(READ_PLACEMENTS[READ_OFFLINE_PLACEMENT])
    );
    for (const suffix of Object.values(READ_ACCESS_SUFFIXES))
        assert.ok(READ_PAGE_RULES.LE1.includes(suffix), `LE1 : ${suffix}`);
    assert.ok(READ_PAGE_RULES.LE1.includes(ONLINE_ACCESS));
    assert.ok(READ_PAGE_RULES.LE6.includes(`${ONLINE_ACCESS}() === false`));
});

// Chaque forme de masquage PUBLIÉE est refusée : sur l'élément qui contient
// le texte d'absence (A4) et sur un élément d'une branche d'état (LE2).
const markup = (form) =>
    ({
        i18n: 'i18n',
        // `i18n-<attr>` ne marque qu'un attribut présent.
        'i18n-*': 'title="Catalogue" i18n-title',
        hidden: 'hidden',
        'aria-hidden': 'aria-hidden="true"',
        '[style.*]': '[style.color]="\'red\'"',
    })[form] ?? `${form}="null"`;

test('B-C5b-pub : chaque forme de masquage publiée est refusée, sur le texte inséré', async (t) => {
    const fixture = await readGrammarFixture(t);
    const ref = fixture.reference;
    for (const form of readHidingForms()) {
        const attribute = markup(form);
        refusedAt(
            fixture,
            swap(ref, H, '<li>', `<li ${attribute}>`),
            `<li ${attribute}>{{ row.id }} ${CELL}</li>`,
            'A4',
            /PAGE_ABSENT_HIDDEN/,
            `A4 ${form}`
        );
        const branch = `<p class="state" ${attribute}>Loading failed.</p>`;
        refusedAt(
            fixture,
            swap(ref, H, ERROR, branch),
            branch,
            'LE2',
            /PAGE_READ_STATE_BRANCH_HIDDEN: .* inside/,
            `LE2 ${form}`
        );
    }
});
