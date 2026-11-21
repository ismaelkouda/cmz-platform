import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import test from 'node:test';
import ts from 'typescript';

import { renderActionGraphDecoder } from './renderers/action-request-typed-result-renderer.mjs';
import { renderActionRequestV2Validation } from './renderers/action-request-v2-renderer-shared.mjs';
import { EMAIL_PATTERN, renderValidation } from './renderers/shared.mjs';
import { createApplicationSessionFixture } from './test-support/application-session-fixture.mjs';
import { repositoryRoot } from './validate-ir.mjs';

// Référence de sens : l'ancienne regex, polynomiale (CodeQL js/polynomial-redos).
// Construite depuis une chaîne pour ne pas être une copie littérale du dépôt.
const LEGACY_EMAIL_PATTERN = new RegExp(String.raw`^[^\s@]+@[^\s@]+\.[^\s@]+$`);

// Entrées pathologiques de l'ancienne regex : celle du message CodeQL et
// celle de la revue du tri (2026-11-19). Sur 64 000 caractères, l'ancienne
// regex prend plusieurs secondes ; la borne de 500 ms reste discriminante
// d'un facteur supérieur à 10 sans dépendre de la charge du poste.
const PATHOLOGICAL_INPUTS = [
    ['message CodeQL', `!@!.${'!.'.repeat(32_000)} `],
    ['domaine fait de points', `a@${'.'.repeat(64_000)} `],
];
const BOUND_MS = 500;

const NAMED_CASES = [
    ['a@b.c', true],
    ['a@b..c', true],
    ['a@.b.c', true],
    ['a.b@c.d.e', true],
    ['a@b.', false],
    ['a@.b', false],
    ['a@b', false],
    ['a b@c.d', false],
    ['a@b@c.d', false],
    ['a@b.c ', false],
    ['@b.c', false],
    ['', false],
];

function* sample(alphabet, maxLength) {
    yield '';
    let level = [''];
    for (let length = 1; length <= maxLength; length += 1) {
        const next = [];
        for (const prefix of level) {
            for (const symbol of alphabet) {
                const value = prefix + symbol;
                next.push(value);
                yield value;
            }
        }
        level = next;
    }
}

function assertSameLanguageAsLegacy(pattern, label) {
    for (const [value, expected] of NAMED_CASES) {
        assert.equal(
            pattern.test(value),
            expected,
            `${label}: ${JSON.stringify(value)}`
        );
    }
    let count = 0;
    for (const value of sample(['a', '.', '@', ' ', '\n', 'é'], 7)) {
        count += 1;
        if (pattern.test(value) !== LEGACY_EMAIL_PATTERN.test(value)) {
            assert.fail(`${label} diverge sur ${JSON.stringify(value)}`);
        }
    }
    assert.ok(count > 300_000, `${label}: échantillon de ${count} chaînes`);
}

function assertLinearOnPathologicalInputs(pattern, label) {
    for (const [name, value] of PATHOLOGICAL_INPUTS) {
        const start = performance.now();
        const accepted = pattern.test(value);
        const elapsed = performance.now() - start;
        assert.equal(accepted, false, `${label} (${name}) doit refuser`);
        assert.ok(
            elapsed < BOUND_MS,
            `${label} (${name}) : ${elapsed.toFixed(1)} ms pour ${value.length} caractères`
        );
    }
}

// Regex littérales effectivement émises dans un source TypeScript généré, lues
// par l'analyseur TypeScript puis reconstruites pour être exécutées.
function emittedEmailPatterns(source) {
    const file = ts.createSourceFile(
        'generated.ts',
        source,
        ts.ScriptTarget.ES2022,
        true,
        ts.ScriptKind.TS
    );
    const patterns = [];
    const visit = (node) => {
        if (
            node.kind === ts.SyntaxKind.RegularExpressionLiteral &&
            node.text.includes('@')
        ) {
            const [, body, flags] = /^\/(.*)\/([a-z]*)$/s.exec(node.text);
            patterns.push({
                text: node.text,
                pattern: new RegExp(body, flags),
            });
        }
        ts.forEachChild(node, visit);
    };
    visit(file);
    return patterns;
}

function assertEmitsTheConstant(source, label) {
    const emitted = emittedEmailPatterns(source);
    assert.ok(emitted.length > 0, `${label} n'émet aucune regex email`);
    for (const { text, pattern } of emitted) {
        assert.equal(text, String(EMAIL_PATTERN), label);
        assertLinearOnPathologicalInputs(pattern, label);
    }
    assertSameLanguageAsLegacy(emitted[0].pattern, label);
}

const readJson = async (path) =>
    JSON.parse(await readFile(join(repositoryRoot, path), 'utf8'));

test('la regex email unique refuse les entrées pathologiques en moins de 500 ms', () => {
    assertLinearOnPathologicalInputs(EMAIL_PATTERN, 'EMAIL_PATTERN');
});

test('la regex email unique garde le langage de l’ancienne regex', () => {
    assertSameLanguageAsLegacy(EMAIL_PATTERN, 'EMAIL_PATTERN');
});

test('l’émetteur des validateurs v1 émet la constante unique', async () => {
    const semantic = await readJson(
        'tools/generator-platform/fixtures/action-request.semantic.json'
    );
    assertEmitsTheConstant(renderValidation(semantic), 'renderValidation');
});

test('l’émetteur des validateurs action-request v2 émet la constante unique', async () => {
    const model = await readJson(
        'examples/users-management-proof/execution/create-user.execution-model.json'
    );
    const action = model.actions[0];
    assert.ok(
        action.port.input.fields.some((field) =>
            field.validations.some(
                (validation) =>
                    validation.kind === 'format' &&
                    validation.format === 'email'
            )
        )
    );
    assertEmitsTheConstant(
        renderActionRequestV2Validation(
            action,
            'export class InvalidPayloadError extends Error {}'
        ),
        'renderActionRequestV2Validation'
    );
});

test('l’émetteur des décodeurs de résultat typé émet la constante unique', async () => {
    const fixture = await createApplicationSessionFixture();
    const action = structuredClone(
        fixture.actions.get('observatory-enter').model.actions[0]
    );
    const field = action.model_graph
        .flatMap((model) => model.fields ?? [])
        .find(
            (candidate) =>
                candidate.type.kind === 'primitive' &&
                candidate.type.name === 'string'
        );
    field.format = 'email';
    assertEmitsTheConstant(
        Object.values(renderActionGraphDecoder(action)).join('\n'),
        'renderActionGraphDecoder'
    );
});

test('toute copie littérale de la regex email dans le dépôt est la constante unique', async () => {
    // Dérivé du dépôt, sans liste tenue à la main : chaque fichier suivi qui
    // contient le motif, y compris la forme échappée d'un gabarit `\\s`.
    let listing = '';
    try {
        listing = execFileSync(
            'git',
            ['grep', '-l', '-I', '-F', '-e', 's@]+@', '--', '.', ':!docs'],
            { cwd: repositoryRoot, encoding: 'utf8' }
        );
    } catch (error) {
        if (error.status !== 1) throw error;
    }
    const copy = /\/\^\[\^\\{1,2}s@\]\+@.*?\$\//g;
    const copies = [];
    for (const path of listing.split('\n').filter(Boolean)) {
        const text = await readFile(join(repositoryRoot, path), 'utf8');
        for (const [literal] of text.matchAll(copy)) {
            copies.push([path, literal.replaceAll('\\\\', '\\')]);
        }
    }
    assert.ok(copies.length > 0);
    for (const [path, literal] of copies) {
        assert.equal(literal, String(EMAIL_PATTERN), path);
    }
});
