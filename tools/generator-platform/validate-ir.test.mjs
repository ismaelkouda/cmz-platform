import assert from 'node:assert/strict';
import test from 'node:test';

import {
    loadJson,
    repositoryRoot,
    validateEvidence,
    validateJsonSchema,
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

test('applique chaque mot-clé JSON Schema utilisé par les schémas du moteur', () => {
    assert.deepEqual(
        validateJsonSchema('abc', { type: 'string', maxLength: 2 }),
        ['$: must contain at most 2 chars']
    );
    assert.deepEqual(
        validateJsonSchema(['same', 'same'], {
            type: 'array',
            uniqueItems: true,
        }),
        ['$: items must be unique']
    );
});

test('oneOf exige exactement un sous-schéma satisfait', () => {
    const schema = {
        type: 'object',
        oneOf: [
            {
                type: 'object',
                additionalProperties: false,
                required: ['method', 'command'],
                properties: {
                    method: { const: 'official-schematic' },
                    command: { type: 'string' },
                },
            },
            {
                type: 'object',
                additionalProperties: false,
                required: ['method', 'reference_tool'],
                properties: {
                    method: { const: 'reference-derived' },
                    reference_tool: { type: 'string' },
                },
            },
        ],
    };
    assert.deepEqual(
        validateJsonSchema(
            { method: 'official-schematic', command: 'ng add x' },
            schema
        ),
        []
    );
    // zéro branche : method inconnue
    assert.deepEqual(
        validateJsonSchema({ method: 'llm', command: 'x' }, schema),
        ['$: must match exactly one subschema of oneOf (matched 0)']
    );
    // deux branches : official-schematic sans sa clé command mais avec
    // reference_tool ne matche qu'une ; on force l'ambiguïté avec un objet vide
    assert.deepEqual(
        validateJsonSchema(
            { method: 'reference-derived', reference_tool: 't', command: 'c' },
            schema
        ),
        ['$: must match exactly one subschema of oneOf (matched 0)']
    );
});

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

test('operation permissions are fail-closed and belong only to authorized access', () => {
    const authorizedWithoutPermission = clone(semantic);
    authorizedWithoutPermission.operations[0].access.mode = 'authorized';
    assert.ok(
        validateSemantic(
            authorizedWithoutPermission,
            semanticSchema,
            evidence
        ).some((error) => error.includes('authorized access needs permissions'))
    );

    const publicWithPermission = clone(semantic);
    publicWithPermission.operations[0].access.permissions = ['auth.login'];
    assert.ok(
        validateSemantic(publicWithPermission, semanticSchema, evidence).some(
            (error) =>
                error.includes('only authorized access may declare permissions')
        )
    );

    const duplicatePermissions = clone(semantic);
    duplicatePermissions.operations[0].access = {
        ...duplicatePermissions.operations[0].access,
        mode: 'authorized',
        permissions: ['auth.login', 'auth.login'],
    };
    duplicatePermissions.integrations[0].authentication = 'bearer';
    assert.ok(
        validateSemantic(duplicatePermissions, semanticSchema, evidence).some(
            (error) => error.includes('duplicate permissions')
        )
    );
});
