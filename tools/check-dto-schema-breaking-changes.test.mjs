import assert from 'node:assert/strict';
import { test } from 'node:test';

import { diffSchemas } from './check-dto-schema-breaking-changes.mjs';

function schema(defs) {
    return { $defs: defs };
}

test('détecte la suppression d’un $defs entier comme breaking', () => {
    const before = schema({ Foo: { type: 'object', properties: {} } });
    const after = schema({});
    const findings = diffSchemas(before, after);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].breaking, true);
    assert.match(findings[0].detail, /définition supprimée/);
});

test('détecte la suppression d’une propriété comme breaking', () => {
    const before = schema({
        Foo: {
            type: 'object',
            properties: { a: { type: 'string' }, b: { type: 'string' } },
        },
    });
    const after = schema({
        Foo: { type: 'object', properties: { a: { type: 'string' } } },
    });
    const findings = diffSchemas(before, after);
    assert.equal(findings.length, 1);
    assert.match(findings[0].detail, /propriété supprimée : b/);
});

test('détecte un changement de type comme breaking', () => {
    const before = schema({
        Foo: { type: 'object', properties: { a: { type: 'string' } } },
    });
    const after = schema({
        Foo: { type: 'object', properties: { a: { type: 'number' } } },
    });
    const findings = diffSchemas(before, after);
    assert.equal(findings.length, 1);
    assert.match(findings[0].detail, /type changé pour a/);
});

test('détecte une propriété devenue required comme breaking', () => {
    const before = schema({
        Foo: {
            type: 'object',
            properties: { a: { type: 'string' } },
            required: [],
        },
    });
    const after = schema({
        Foo: {
            type: 'object',
            properties: { a: { type: 'string' } },
            required: ['a'],
        },
    });
    const findings = diffSchemas(before, after);
    assert.equal(findings.length, 1);
    assert.match(findings[0].detail, /devenue required/);
});

test('détecte une valeur enum supprimée comme breaking', () => {
    const before = schema({
        Foo: {
            type: 'object',
            properties: { a: { type: 'string', enum: ['x', 'y'] } },
        },
    });
    const after = schema({
        Foo: {
            type: 'object',
            properties: { a: { type: 'string', enum: ['x'] } },
        },
    });
    const findings = diffSchemas(before, after);
    assert.equal(findings.length, 1);
    assert.match(findings[0].detail, /valeur\(s\) enum supprimée\(s\).*y/);
});

test('détecte additionalProperties resserré à false comme breaking', () => {
    const before = schema({
        Foo: { type: 'object', properties: {}, additionalProperties: true },
    });
    const after = schema({
        Foo: { type: 'object', properties: {}, additionalProperties: false },
    });
    const findings = diffSchemas(before, after);
    assert.equal(findings.length, 1);
    assert.match(findings[0].detail, /additionalProperties resserré/);
});

test('détecte une valeur supprimée d’un enum top-level comme breaking', () => {
    const before = schema({ Status: { type: 'string', enum: ['a', 'b'] } });
    const after = schema({ Status: { type: 'string', enum: ['a'] } });
    const findings = diffSchemas(before, after);
    assert.equal(findings.length, 1);
    assert.match(findings[0].detail, /valeur\(s\) enum supprimée\(s\).*b/);
});

test('n’échoue pas sur l’ajout d’un nouveau $defs', () => {
    const before = schema({ Foo: { type: 'object', properties: {} } });
    const after = schema({
        Foo: { type: 'object', properties: {} },
        Bar: { type: 'object', properties: {} },
    });
    assert.deepEqual(diffSchemas(before, after), []);
});

test('n’échoue pas sur l’ajout d’une propriété optionnelle', () => {
    const before = schema({
        Foo: { type: 'object', properties: { a: { type: 'string' } } },
    });
    const after = schema({
        Foo: {
            type: 'object',
            properties: {
                a: { type: 'string' },
                b: { type: 'string' },
            },
        },
    });
    assert.deepEqual(diffSchemas(before, after), []);
});

test('n’échoue pas quand une propriété devient optionnelle (assouplissement)', () => {
    const before = schema({
        Foo: {
            type: 'object',
            properties: { a: { type: 'string' } },
            required: ['a'],
        },
    });
    const after = schema({
        Foo: {
            type: 'object',
            properties: { a: { type: 'string' } },
            required: [],
        },
    });
    assert.deepEqual(diffSchemas(before, after), []);
});

test('n’échoue pas sur l’ajout d’une valeur enum', () => {
    const before = schema({
        Foo: {
            type: 'object',
            properties: { a: { type: 'string', enum: ['x'] } },
        },
    });
    const after = schema({
        Foo: {
            type: 'object',
            properties: { a: { type: 'string', enum: ['x', 'y'] } },
        },
    });
    assert.deepEqual(diffSchemas(before, after), []);
});

test('schéma identique ne produit aucun écart', () => {
    const s = schema({
        Foo: {
            type: 'object',
            properties: { a: { type: 'string' } },
            required: ['a'],
            additionalProperties: false,
        },
    });
    assert.deepEqual(diffSchemas(s, structuredClone(s)), []);
});
