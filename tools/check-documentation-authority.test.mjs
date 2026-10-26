import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, posix } from 'node:path';
import test from 'node:test';

import {
    AUTHORITY_FILES,
    collectAuthorityViolations,
    readAuthorityDocuments,
} from './check-documentation-authority.mjs';

const currentLine =
    /^- \*\*Cap du dépôt — décision courante :\*\*[^\n]*(?:\n {2,}\S[^\n]*)*\n/m;
const supersessionLine = /^- \*\*Superseded pour [^\n]*(?:\n {2,}\S[^\n]*)*\n/m;

function rejects(documents, diagnostic) {
    assert.ok(
        collectAuthorityViolations(documents).some((message) =>
            diagnostic.test(message)
        ),
        `diagnostic attendu : ${diagnostic}`
    );
}

function predecessorPath(documents) {
    const target = documents.productCap.match(
        /^- \*\*Supersède pour [^*]+ :\*\*\s+\[[^\]]+\]\(([^)]+)\)$/m
    )?.[1];
    assert.ok(target, 'declared predecessor link');
    return posix.normalize(
        posix.join(posix.dirname(AUTHORITY_FILES.productCap), target)
    );
}

function fixture(t) {
    const root = mkdtempSync(join(tmpdir(), 'cmz-authority-'));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    const documents = readAuthorityDocuments();
    for (const [key, path] of Object.entries(AUTHORITY_FILES)) {
        mkdirSync(dirname(join(root, path)), { recursive: true });
        writeFileSync(join(root, path), documents[key]);
    }
    const previous = predecessorPath(documents);
    mkdirSync(dirname(join(root, previous)), { recursive: true });
    writeFileSync(join(root, previous), documents.productPredecessor);
    return { root, documents };
}

test('the repository documentation has one explicit current authority', () => {
    assert.deepEqual(collectAuthorityViolations(readAuthorityDocuments()), []);
});

for (const key of ['authority', 'roadmap']) {
    test(`${key}: a historical link or product mention cannot replace current metadata`, () => {
        const documents = readAuthorityDocuments();
        const link = documents[key].match(currentLine)[0];
        documents[key] = documents[key].replace(currentLine, '');
        documents[key] += `\n## Historique\n\nSEOS\n\n${link}`;
        rejects(documents, /renvoi courant unique/);
    });

    for (const target of [
        './decision-inexistante.md',
        './0101-premiere-application-reelle-et-priorite-produit.md',
        posix.relative(
            posix.dirname(AUTHORITY_FILES[key]),
            AUTHORITY_FILES.adr94
        ),
    ]) {
        test(`${key}: incorrect current target ${target} is rejected`, () => {
            const documents = readAuthorityDocuments();
            documents[key] = documents[key].replace(currentLine, (line) =>
                line.replace(
                    /\]\([^)]*\)/,
                    `](${target.startsWith('.') ? target : `./${target}`})`
                )
            );
            rejects(documents, /renvoi courant unique/);
        });
    }

    test(`${key}: quoted, fenced or duplicate current metadata is rejected`, () => {
        for (const wrap of [
            (line) => `> ${line}`,
            (line) => `\x60\x60\x60md\n${line}\x60\x60\x60\n`,
            (line) => line + line,
        ]) {
            const documents = readAuthorityDocuments();
            documents[key] = documents[key].replace(currentLine, wrap);
            rejects(documents, /renvoi courant unique/);
        }
    });

    test(`${key}: equivalent relative current link is accepted`, () => {
        const documents = readAuthorityDocuments();
        documents[key] = documents[key].replace(currentLine, (line) =>
            line.replace('](', '](./')
        );
        assert.deepEqual(collectAuthorityViolations(documents), []);
    });
}

for (const status of ['Proposed', 'Superseded', 'Superseded by ADR-9999']) {
    test(`current decision cannot have status ${status}`, () => {
        const documents = readAuthorityDocuments();
        documents.productCap = documents.productCap.replace(
            '**Statut :** Accepted',
            `**Statut :** ${status}`
        );
        documents.productCap += '\n> - **Statut :** Accepted\n';
        rejects(documents, /cap courant.*Accepted en tête/);
    });
}

test('Accepted only in the body, a quote or a fenced example is insufficient', () => {
    for (const replacement of [
        '> - **Statut :** Accepted',
        '```md\n- **Statut :** Accepted\n```',
        '## Historique\n\n- **Statut :** Accepted',
    ]) {
        const documents = readAuthorityDocuments();
        documents.productCap = documents.productCap.replace(
            '- **Statut :** Accepted',
            replacement
        );
        rejects(documents, /cap courant.*Accepted en tête/);
    }
});

test('duplicate status metadata is ambiguous and rejected', () => {
    const documents = readAuthorityDocuments();
    documents.productCap = documents.productCap.replace(
        '- **Statut :** Accepted',
        '- **Statut :** Accepted\n- **Statut :** Proposed'
    );
    rejects(documents, /cap courant.*Accepted en tête/);
});

test('the predecessor declaration is required and cannot link to itself', () => {
    for (const value of [
        '',
        `[cap](./${posix.basename(AUTHORITY_FILES.productCap)})`,
    ]) {
        const documents = readAuthorityDocuments();
        documents.productCap = documents.productCap.replace(
            /^- \*\*Supersède pour [^\n]*(?:\n {2,}\S[^\n]*)*$/m,
            value ? `- **Supersède pour la même portée :** ${value}` : ''
        );
        rejects(documents, /déclarer sa supersession partielle/);
    }
});

test('partial supersession must be reciprocal, scoped and in predecessor metadata', () => {
    for (const mutate of [
        (text) => text.replace(supersessionLine, ''),
        (text) =>
            text.replace(supersessionLine, (line) =>
                line.replace('§Décision', '§Autre')
            ),
        (text) =>
            text.replace(supersessionLine, (line) =>
                line.replace(/\]\([^)]*\)/, '](./autre.md)')
            ),
        (text) =>
            text.replace(supersessionLine, '') +
            '\n' +
            text.match(supersessionLine)[0],
        (text) =>
            text.replace('**Statut :** Accepted', '**Statut :** Superseded'),
    ]) {
        const documents = readAuthorityDocuments();
        documents.productPredecessor = mutate(documents.productPredecessor);
        rejects(documents, /supersession partielle réciproque/);
    }
});

test('current decision name is arbitrary; no product name is required by the guard', () => {
    const documents = readAuthorityDocuments();
    documents.productCap =
        documents.productCap.split('\n## Contexte')[0] +
        '\n## Décision\n\nLe produit est un atelier réutilisable sans première application imposée.\n';
    assert.deepEqual(collectAuthorityViolations(documents), []);
});

test('the predecessor is read from the declared link, including a different file', (t) => {
    const { root, documents } = fixture(t);
    const original = posix.basename(predecessorPath(documents));
    const alternate = 'decision-precedente.md';
    writeFileSync(
        join(root, AUTHORITY_FILES.productCap),
        documents.productCap.replace(original, alternate)
    );
    rejects(readAuthorityDocuments(root), /supersession partielle réciproque/);
    writeFileSync(
        join(root, 'docs/adr', alternate),
        documents.productPredecessor
    );
    assert.deepEqual(
        collectAuthorityViolations(readAuthorityDocuments(root)),
        []
    );
});

for (const key of ['productCap', 'retainedDiscoveryBrief']) {
    test(`missing ${key} is rejected when reading files`, (t) => {
        const { root } = fixture(t);
        rmSync(join(root, AUTHORITY_FILES[key]));
        assert.ok(
            collectAuthorityViolations(readAuthorityDocuments(root)).some(
                (message) =>
                    message.includes(`${AUTHORITY_FILES[key]} est absent`)
            )
        );
    });
}

test('the retained brief cannot silently leave discovery', () => {
    const documents = readAuthorityDocuments();
    documents.retainedDiscoveryBrief = documents.retainedDiscoveryBrief.replace(
        '**Statut :** découverte produit',
        '**Statut :** livré'
    );
    rejects(documents, /brief de découverte conservé/);
});

test('the guard rejects the retired create-app apply protocol', () => {
    const documents = readAuthorityDocuments();
    documents.appBuilder +=
        '\nbun run create-app -- --app demo --apply abcdef\n';
    rejects(documents, /--apply/);
});

test('the guard rejects loss of the historical-ledger warning', () => {
    const documents = readAuthorityDocuments();
    documents.ledger = documents.ledger.replace(
        'Registre historique, pas feuille de route courante',
        'Tâches'
    );
    rejects(documents, /registre historique/);
});

test('wrapped field names and values preserve the same authority', () => {
    const documents = readAuthorityDocuments();
    assert.deepEqual(collectAuthorityViolations(documents), []);
    for (const key of [
        'authority',
        'roadmap',
        'productCap',
        'productPredecessor',
    ]) {
        documents[key] = documents[key].replace(/\n {2,}(?=\S)/g, ' ');
    }
    assert.deepEqual(collectAuthorityViolations(documents), []);
});

test('unindented continuations cannot complete supersession metadata', () => {
    for (const key of ['productCap', 'productPredecessor']) {
        const documents = readAuthorityDocuments();
        documents[key] = documents[key].replace(/\n {2,}(?=\S)/g, '\n');
        rejects(
            documents,
            key === 'productCap'
                ? /déclarer sa supersession partielle/
                : /supersession partielle réciproque/
        );
    }
});
