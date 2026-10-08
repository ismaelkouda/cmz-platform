import assert from 'node:assert/strict';
import test from 'node:test';

import {
    collectAuthorityViolations,
    readAuthorityDocuments,
} from './check-documentation-authority.mjs';

test('the repository documentation has one explicit current authority', () => {
    assert.deepEqual(collectAuthorityViolations(readAuthorityDocuments()), []);
});

test('the guard rejects the retired create-app apply protocol', () => {
    const documents = readAuthorityDocuments();
    documents.appBuilder +=
        '\nbun run create-app -- --app demo --apply abcdef\n';

    assert.ok(
        collectAuthorityViolations(documents).some((violation) =>
            violation.includes('--apply')
        )
    );
});

test('the guard rejects loss of the historical-ledger warning', () => {
    const documents = readAuthorityDocuments();
    documents.ledger = documents.ledger.replace(
        'Registre historique, pas feuille de route courante',
        'Tâches'
    );

    assert.ok(
        collectAuthorityViolations(documents).some((violation) =>
            violation.includes('registre historique')
        )
    );
});
