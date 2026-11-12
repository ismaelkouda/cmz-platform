// X5 C5 (E8, B-C5-1, B+) : section `read_states` du bon de travail, et borne
// du texte d'absence (liste blanche du diagnostic tiers aveugle).
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
    ABSENT_TEXT_MAX,
    ABSENT_TEXT_PATTERN,
    absentTextError,
} from './core/absent-text.mjs';
import { readStates } from './core/external-read-states.mjs';
import { EXTERNAL_QUERY_STATES } from './core/list-query-external-profile.mjs';

const node = {
    id: 'things-list',
    presentation: {
        loading_state_id: 'loading',
        success_state_id: 'ready',
        empty_state_id: null,
        error_state_id: 'failed',
    },
};
const query = (code) => ({
    read_model: {
        fields: [
            { name: 'name', required: true, nullable: false },
            { name: 'code', required: true, nullable: false, ...code },
        ],
    },
});
const binding = (id, extra = {}) => ({
    id,
    producer_node_id: node.id,
    output: { kind: 'list' },
    ...extra,
});
const states = (bindings, code = {}) =>
    readStates(
        { query_nodes: [node], output_bindings: bindings },
        new Map([[node.id, query(code)]])
    );

test('read_states : six états de la source unique, identifiants du plan, hors ligne', () => {
    const [entry] = states([binding('rows')]);
    assert.deepEqual(Object.keys(entry.states), [...EXTERNAL_QUERY_STATES]);
    assert.deepEqual(entry, {
        node_id: 'things-list',
        member: 'thingsList',
        states: {
            idle: null,
            loading: 'loading',
            success: 'ready',
            empty: null,
            error: 'failed',
            reloading: null,
        },
        offline: 'online',
        absent_fields: [],
        bindings: [{ binding_id: 'rows', absent_text_path: null }],
    });
});

test('read_states (B+) : le CHEMIN du texte d’absence, jamais le texte', () => {
    const [entry] = states(
        [binding('rows', { absent_text: 'Non renseigné' })],
        { nullable: true }
    );
    assert.deepEqual(entry.absent_fields, ['code']);
    assert.deepEqual(entry.bindings, [
        { binding_id: 'rows', absent_text_path: 'absentText.rows' },
    ]);
    assert.doesNotMatch(JSON.stringify(entry), /Non renseigné/);
});

// La nullabilité vient du modèle de lecture compilé : nullable OU facultatif.
test('read_states : un champ lu nullable ou facultatif exige absent_text, nommé', () => {
    for (const code of [{ nullable: true }, { required: false }]) {
        assert.throws(
            () => states([binding('rows')], code),
            /PAGE_ABSENT_TEXT_MISSING: data binding rows needs absent_text for code/,
            JSON.stringify(code)
        );
        assert.throws(
            () => states([], code),
            /PAGE_ABSENT_TEXT_MISSING: data binding for things-list needs absent_text for code/,
            JSON.stringify(code)
        );
    }
    // Deux liaisons, deux textes : une constante chacune, plus d'ambiguïté.
    const [entry] = states(
        [
            binding('a', { absent_text: 'Non renseigné' }),
            binding('b', { absent_text: 'Inconnu' }),
        ],
        { nullable: true }
    );
    assert.deepEqual(
        entry.bindings.map((item) => item.absent_text_path),
        ['absentText.a', 'absentText.b']
    );
});

test('absent_text : liste blanche du tiers, bornes, refus nommés', () => {
    for (const text of [
        'Non renseigné',
        'Non communiqué par le demandeur',
        'N/A',
        'Œuvre',
        '« Inconnu »',
        'é'.repeat(ABSENT_TEXT_MAX),
    ])
        assert.equal(absentTextError(text), undefined, text);
    for (const [label, text, message] of [
        ['vide', '', /1 to 40 characters/],
        ['trop long', 'a'.repeat(ABSENT_TEXT_MAX + 1), /1 to 40 characters/],
        ['non chaîne', 1, /must be a string/],
        ['symbole seul', '—', /at least one letter/],
        ['chiffres seuls', '12', /at least one letter/],
        ['espace en tête', ' a', /single inner spaces/],
        ['espace en fin', 'a ', /single inner spaces/],
        ['espace doublée', 'a  b', /single inner spaces/],
    ]) {
        const error = absentTextError(text);
        assert.match(error, /^PAGE_ABSENT_TEXT_INVALID: /, label);
        assert.match(error, message, label);
    }
    for (const character of [
        ...'{}<>@`$"&\\|#%*+=[]^~_×÷',
        '\u0000',
        '\u007f',
        ' ',
        ' ',
        '​',
        '‮',
        '⁦',
        ' ',
        '﻿',
        '\n',
        '́',
        'а',
        'ο',
    ])
        assert.match(
            absentTextError(`a${character}b`),
            /^PAGE_ABSENT_TEXT_INVALID: /,
            `U+${character.codePointAt(0).toString(16)}`
        );
});

// Le plan scellé porte le texte, borné par le même motif dans son schéma.
test('absent_text : le schéma du plan porte le motif exact, sans drapeau u', async () => {
    const schema = JSON.parse(
        await readFile(
            new URL(
                './schemas/page-execution-plan.schema.json',
                import.meta.url
            ),
            'utf8'
        )
    );
    assert.deepEqual(schema.$defs.outputBinding.properties.absent_text, {
        type: 'string',
        minLength: 1,
        maxLength: ABSENT_TEXT_MAX,
        pattern: ABSENT_TEXT_PATTERN,
    });
    assert.ok(new RegExp(ABSENT_TEXT_PATTERN).test('Non renseigné'));
});
