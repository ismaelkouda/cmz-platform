import assert from 'node:assert/strict';
import test from 'node:test';

import {
    loadJson,
    repositoryRoot,
    validateEvidence,
    validateSemantic,
} from './validate-ir.mjs';

const fixtureRoot = new URL('./fixtures/', import.meta.url);
const schemaRoot = new URL('./schemas/', import.meta.url);

const [evidence, evidenceSchema, semantic, semanticSchema] = await Promise.all([
    loadJson(new URL('action-request.evidence.json', fixtureRoot)),
    loadJson(new URL('evidence.schema.json', schemaRoot)),
    loadJson(new URL('action-request.semantic.json', fixtureRoot)),
    loadJson(new URL('semantic-model.schema.json', schemaRoot)),
]);

function clone(value) {
    return structuredClone(value);
}

test('canonical action-request evidence and semantic models are valid', async () => {
    assert.deepEqual(
        await validateEvidence(evidence, evidenceSchema, {
            rootDirectory: repositoryRoot,
        }),
        []
    );
    assert.deepEqual(validateSemantic(semantic, semanticSchema, evidence), []);
});

test('stale source provenance is rejected', async () => {
    const mutated = clone(evidence);
    mutated.sources[0].sha256 = '0'.repeat(64);

    const errors = await validateEvidence(mutated, evidenceSchema, {
        rootDirectory: repositoryRoot,
    });
    assert.ok(errors.some((error) => error.includes('stale sha256')));
});

test('unresolved semantic evidence references are rejected', () => {
    const mutated = clone(semantic);
    mutated.operations[0].evidence_refs.push('fact.does-not-exist');

    const errors = validateSemantic(mutated, semanticSchema, evidence);
    assert.ok(
        errors.some((error) => error.includes('unresolved evidence reference'))
    );
});

test('target-specific framework leakage is rejected', () => {
    const mutated = clone(semantic);
    mutated.domain.description = 'Authentication generated for Angular.';

    const errors = validateSemantic(mutated, semanticSchema, evidence);
    assert.ok(
        errors.some((error) => error.includes('target-specific leakage'))
    );
});

test('unresolved model types are rejected', () => {
    const mutated = clone(semantic);
    mutated.operations[0].input.name = 'missing-input';

    const errors = validateSemantic(mutated, semanticSchema, evidence);
    assert.ok(errors.some((error) => error.includes('unresolved model type')));
});

test('constraints must target a declared field', () => {
    const mutated = clone(semantic);
    mutated.constraints[0].target = 'login-input.unknown';

    const errors = validateSemantic(mutated, semanticSchema, evidence);
    assert.ok(errors.some((error) => error.includes('unresolved target')));
});

test('operation access and integration authentication must agree', () => {
    const publicWithBearer = clone(semantic);
    publicWithBearer.integrations[0].authentication = 'bearer';
    assert.ok(
        validateSemantic(publicWithBearer, semanticSchema, evidence).some(
            (error) => error.includes('public access requires unauthenticated')
        )
    );

    const authenticatedWithoutTransport = clone(semantic);
    authenticatedWithoutTransport.operations[0].access.mode = 'authenticated';
    assert.ok(
        validateSemantic(
            authenticatedWithoutTransport,
            semanticSchema,
            evidence
        ).some((error) =>
            error.includes('authenticated access requires authenticated')
        )
    );
});
