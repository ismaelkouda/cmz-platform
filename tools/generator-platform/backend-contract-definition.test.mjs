import assert from 'node:assert/strict';
import test from 'node:test';

import {
    compileStructuredBackendDefinition,
    serializeCanonicalBackendContract,
    structuredDefinitionSha256,
} from './core/structured-backend-adapter.mjs';
import { loadJson } from './validate-ir.mjs';

const schema = await loadJson(
    new URL('./schemas/backend-contract.schema.json', import.meta.url)
);

function definition() {
    return {
        schema_version: '1.0.0',
        kind: 'backend-contract-definition',
        contract: {
            id: 'clean-street-api',
            title: 'Clean Street API',
            version: '1.0.0',
            status: 'planned',
            description: 'API cible à construire pour Clean Street.',
        },
        source: { id: 'clean-street-planned', authority: 'declared' },
        services: [
            {
                id: 'content',
                description: 'Contenu public.',
                base_urls: [
                    {
                        environment: 'production',
                        url: 'https://api.clean-street.example/content/v1/',
                    },
                ],
            },
        ],
        security_schemes: [],
        models: [
            {
                id: 'home-block',
                kind: 'object',
                description: "Bloc de l'accueil.",
                fields: [
                    {
                        name: 'title',
                        description: 'Titre public.',
                        required: true,
                        nullable: false,
                        type: { kind: 'primitive', name: 'string' },
                    },
                ],
            },
            {
                id: 'home-block-list',
                kind: 'array',
                description: 'Blocs publics.',
                items: { kind: 'model', model_id: 'home-block' },
            },
        ],
        operations: [
            {
                id: 'content.list-home-blocks',
                service_id: 'content',
                description: "Charge l'accueil public.",
                method: 'GET',
                path: '/home-blocks',
                access: {
                    mode: 'public',
                    security_scheme_ids: [],
                    permissions: [],
                },
                request: { parameters: [] },
                responses: [
                    {
                        status: 200,
                        outcome: 'success',
                        description: 'Blocs disponibles.',
                        body: {
                            media_type: 'application/json',
                            model_id: 'home-block-list',
                            envelope: {
                                kind: 'object',
                                data_field: 'data',
                                error_field: 'error',
                                message_field: 'message',
                            },
                        },
                    },
                ],
            },
        ],
    };
}

function compile(value = definition()) {
    return compileStructuredBackendDefinition({
        definition: value,
        snapshotUri: 'contracts/clean-street.definition.json',
        snapshotSha256: 'a'.repeat(64),
        backendContractSchema: schema,
    });
}

test('projette une définition planned en contrat canonique entièrement traçable', () => {
    const contract = compile();
    assert.equal(contract.contract.status, 'planned');
    assert.equal(contract.sources[0].status, 'planned');
    assert.equal(contract.operations[0].status, 'planned');
    assert.deepEqual(contract.models[0].fields[0].evidence, [
        {
            source_id: 'clean-street-planned',
            locator: '/models/0/fields/0',
        },
    ]);
    assert.deepEqual(contract.operations[0].responses[0].body.evidence, [
        {
            source_id: 'clean-street-planned',
            locator: '/operations/0/responses/0/body',
        },
    ]);
});

test('sérialise un résultat déterministe indépendamment de l’ordre des clés source', () => {
    const first = definition();
    const second = {
        operations: first.operations,
        models: first.models,
        security_schemes: first.security_schemes,
        services: first.services,
        source: first.source,
        contract: first.contract,
        kind: first.kind,
        schema_version: first.schema_version,
    };
    assert.equal(
        serializeCanonicalBackendContract(compile(first)),
        serializeCanonicalBackendContract(compile(second))
    );
});

test('refuse qu’une définition manuelle s’auto-déclare implemented ou live', () => {
    for (const status of ['implemented', 'verified-live']) {
        const value = definition();
        value.contract.status = status;
        assert.throws(() => compile(value), /only reference or planned/);
    }
});

test('refuse de maquiller une référence analogue en contrat cible planned', () => {
    const value = definition();
    value.source.authority = 'observational';
    assert.throws(
        () => compile(value),
        /planned requires source.authority=declared/
    );

    value.contract.status = 'reference';
    assert.doesNotThrow(() => compile(value));
});

test('l’adaptateur possède seul provenance et statuts des entités', () => {
    const withEvidence = definition();
    withEvidence.operations[0].evidence = [];
    assert.throws(() => compile(withEvidence), /adapter-owned property/);

    const withStatus = definition();
    withStatus.models[0].status = 'verified-live';
    assert.throws(
        () => compile(withStatus),
        /status: entity status is derived/
    );
});

test('échoue avant sortie si la projection canonique est incomplète', () => {
    const value = definition();
    delete value.operations[0].responses[0].description;
    assert.throws(() => compile(value), /canonical projection rejected/);
});

test('l’empreinte de définition dépend des octets exacts, pas du JSON interprété', () => {
    assert.notEqual(
        structuredDefinitionSha256('{"a":1}\n'),
        structuredDefinitionSha256('{ "a": 1 }\n')
    );
});
