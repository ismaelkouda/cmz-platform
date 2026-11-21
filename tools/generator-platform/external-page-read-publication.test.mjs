// X5 C5b, B-C5b-pub (Fable) : `read_states.rules` est le contrat lu par l'IA ;
// il nomme EXACTEMENT ce que le code refuse. Les listes viennent des
// constantes de l'enforcement ; chaque forme listée est refusée pour de vrai.
import * as angular from '@angular/compiler';
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    OFFLINE_BRANCH_ID,
    ONLINE_ACCESS,
    READ_ACCESS_SUFFIXES,
    READ_HIDING,
    READ_OFFLINE_PLACEMENT,
    READ_PAGE_RULES,
    READ_PLACEMENTS,
    readAccess,
    readHidingForms,
    readStateBranchId,
} from './core/read-access.mjs';
import { readTemplateViolations } from './core/page-grammar/read-template.mjs';
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
        // X5 C6 N5-1 : un état = une branche, racine identifiée (littéral).
        'exactly one branch of its own (no ||, no @case group)',
        // X5 C6 F1 : racine RENDUE (ng-container et ng-template exclus).
        'whose content is exactly one rendered element (not ng-container, ng-template) with data-cmz-id="<node_id>-state-<state>" (branch_ids), that id nowhere else',
        'no contract id is offline-branch or <id>-state-<idle, loading, success, empty, error, reloading>',
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
    LE6: [
        '=== false',
        'exactly one',
        'nowhere else',
        'whose content is exactly one rendered element (not ng-container, ng-template) with data-cmz-id="offline-branch" (offline_branch_id), that id nowhere else',
    ],
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
    // X5 C6 N5-1 : `||` n'est plus permis entre états hors succès.
    assert.ok(!READ_PAGE_RULES.LE4.includes('||'));
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

// Q4 et Q6 (E, validation de 8a9bad2b) : les listes de l'enforcement sont
// épinglées en LITTÉRAL. Sans cela, retirer une entrée de la constante
// change d'un même geste le texte attendu et le texte publié.
test('B-C5b-pub (Q4, Q6) : formes de masquage et emplacements épinglés en littéral', () => {
    assert.deepEqual(readHidingForms(), [
        'i18n',
        'i18n-*',
        'hidden',
        'aria-hidden',
        '[hidden]',
        '[style]',
        '[attr.hidden]',
        '[attr.aria-hidden]',
        '[attr.style]',
        '[style.*]',
    ]);
    assert.deepEqual(Object.keys(READ_PLACEMENTS), [
        'root',
        'offline-else',
        'read-branch',
    ]);
});

// Q6 : une page à DEUX lectures. L'aiguillage de la seconde, placé dans une
// branche de la première, est accepté (emplacement « read-branch »). Les deux
// produits fictifs n'ont qu'une lecture : le contexte est construit ici, avec
// les fonctions de production (readAccess, readTemplateViolations).
test('B-C5b-pub (Q6) : l’aiguillage d’une lecture dans la branche d’une autre lecture est accepté', () => {
    // Identifiants publiés comme au bon de travail (X5 C6 N5-1).
    const STATES = [
        'idle',
        'loading',
        'success',
        'empty',
        'error',
        'reloading',
    ];
    const states = (member) => ({
        member,
        node_id: member,
        branch_ids: Object.fromEntries(
            STATES.map((state) => [state, readStateBranchId(member, state)])
        ),
        states: Object.fromEntries(
            ['idle', 'loading', 'success', 'empty', 'error', 'reloading'].map(
                (state) => [state, null]
            )
        ),
        absent_fields: [],
        bindings: [],
    });
    const reads = {
        online: ONLINE_ACCESS,
        offlineBranchId: OFFLINE_BRANCH_ID,
        reads: [readAccess(states('first')), readAccess(states('second'))],
        absentTexts: [],
    };
    const cases = (access, inner) =>
        ['idle', 'loading', 'success', 'empty', 'error', 'reloading']
            .map(
                (state) =>
                    `@case ('${state}') {\n<div data-cmz-id="${access}-state-${state}">\n${state === 'success' ? inner : `<p>${access} ${state}</p>`}\n</div>\n}`
            )
            .join('\n');
    const html = `<main>
@if (online() === false) {
<div data-cmz-id="offline-branch"><p>offline</p></div>
} @else {
@switch (firstState()) {
${cases('first', `@switch (secondState()) {\n${cases('second', '<p>second rows</p>')}\n}`)}
}
}
</main>`;
    const nodes = angular.parseTemplate(html, 'page.component.html', {
        preserveWhitespaces: false,
    }).nodes;
    assert.deepEqual(
        readTemplateViolations('page.component.html', html, nodes, reads),
        []
    );
});
