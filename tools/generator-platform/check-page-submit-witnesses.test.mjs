// X4-sécurité-3, N4 : jugement des témoins natifs de la soumission, sans
// navigateur. La mesure réelle tourne en CI (check:page-submit-witnesses).
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    judge,
    WITNESSES,
    witnessPage,
} from './check-page-submit-witnesses.mjs';

const measured = (overrides = {}) =>
    WITNESSES.map((witness) => ({
        id: witness.id,
        submissions: witness.expected,
        documents: 1 + witness.expected,
        logged: witness.logged,
        ...overrides[witness.id],
    }));

test('N4 : les trois témoins attendus passent', () => {
    const { lines, failed } = judge(measured());
    assert.equal(failed, 0);
    assert.equal(lines.length, 3);
    for (const line of lines) assert.match(line, /^PASS page-submit-witness\//);
});

test('N4 : une soumission native sur false ou sur une levée, ou aucune sur undefined, échoue', () => {
    for (const [id, change] of [
        ['false', { submissions: 1, documents: 2 }],
        ['throws', { submissions: 1, documents: 2 }],
        ['throws', { logged: false }],
        ['undefined', { submissions: 0, documents: 1 }],
    ])
        assert.equal(
            judge(measured({ [id]: change })).failed,
            1,
            `${id} ${JSON.stringify(change)}`
        );
    assert.equal(judge([]).failed, 3);
});

test('N4 : la page témoin porte un formulaire par témoin, chacun vers sa méthode', () => {
    const page = witnessPage('app-page-12345678')['page.component.ts'];
    assert.match(page, /selector: 'app-page-12345678'/);
    for (const { id, method } of WITNESSES) {
        assert.ok(
            page.includes(
                `id="w-${id}" action="/cmz-witness/${id}" (submit)="${method}()"`
            ),
            id
        );
        assert.match(page, new RegExp(`protected ${method}\\(\\)`));
    }
});
