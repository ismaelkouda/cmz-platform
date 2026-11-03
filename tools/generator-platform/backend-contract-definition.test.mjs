import assert from 'node:assert/strict';
import test from 'node:test';

import {
    compileReferenceBackendAdoption,
    compileStructuredBackendDefinition,
    serializeCanonicalBackendContract,
    structuredDefinitionSha256,
} from './core/structured-backend-adapter.mjs';
import { loadJson } from './validate-ir.mjs';
import { compileRuntimeObservationBackend } from './adapters/runtime-observation-backend-adapter.mjs';
import { observedBackendFixture } from './test-support/runtime-observation-backend-fixture.mjs';
import { resolveObservationPointer } from './core/runtime-observation-evidence.mjs';

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

test('historical structured definition cannot silently opt in to backend 1.1 features', () => {
    const value = definition();
    value.models[0].fields[0].format = 'email';
    assert.throws(
        () =>
            compileStructuredBackendDefinition({
                definition: value,
                snapshotUri: 'contracts/input.json',
                snapshotSha256: 'a'.repeat(64),
                backendContractSchema: schema,
            }),
        /require backend-contract 1.1.0/
    );
});

function adoptionInputs(basis) {
    if (!basis) {
        const reference = definition();
        reference.contract.status = 'reference';
        reference.source.authority = 'observational';
        basis = compile(reference);
    }
    const basisBytes = serializeCanonicalBackendContract(basis);
    return {
        definition: {
            schema_version: '1.1.0',
            kind: 'backend-contract-definition',
            contract: {
                ...basis.contract,
                status: 'planned',
                version: '1.0.1',
            },
            source: { id: 'explicit-adoption', authority: 'declared' },
            basis: {
                snapshot_uri: 'contracts/reference.json',
                sha256: structuredDefinitionSha256(basisBytes),
            },
            decision: {
                snapshot_uri: 'contracts/decision.json',
                sha256: 'd'.repeat(64),
            },
        },
        basis,
        basisSha256: structuredDefinitionSha256(basisBytes),
        snapshotUri: 'contracts/adoption.json',
        snapshotSha256: 'a'.repeat(64),
        backendContractSchema: schema,
    };
}

function withoutAdoptionDelta(value) {
    const original = structuredClone(value);
    delete original.contract;
    original.sources = original.sources.filter(
        (source) => source.id !== 'explicit-adoption'
    );
    const pending = [original];
    while (pending.length) {
        const current = pending.pop();
        if (!current || typeof current !== 'object') continue;
        if (Object.hasOwn(current, 'evidence'))
            current.evidence = current.evidence.filter(
                (entry) => entry.source_id !== 'explicit-adoption'
            );
        pending.push(...Object.values(current));
    }
    for (const group of [
        'services',
        'security_schemes',
        'models',
        'operations',
    ])
        for (const entity of original[group]) entity.status = 'reference';
    return original;
}

test('adopte une référence 1.0 sans perte ni mutation de la source', () => {
    const input = adoptionInputs();
    const before = structuredClone(input.basis);
    const target = compileReferenceBackendAdoption(input);
    assert.equal(target.schema_version, '1.0.0');
    assert.equal(target.contract.status, 'planned');
    assert.deepEqual(input.basis, before);
    assert.deepEqual(
        withoutAdoptionDelta(target),
        withoutAdoptionDelta(before)
    );
    assert.deepEqual(target.sources.slice(0, -1), before.sources);
    assert.deepEqual(target.sources.at(-1), {
        id: 'explicit-adoption',
        kind: 'manual',
        authority: 'declared',
        status: 'planned',
        snapshot_uri: input.snapshotUri,
        sha256: input.snapshotSha256,
    });
    for (const group of [
        'services',
        'security_schemes',
        'models',
        'operations',
    ]) {
        for (const entity of target[group]) {
            assert.equal(entity.status, 'planned');
            for (const proof of entity.evidence.filter(
                (entry) => entry.source_id === 'explicit-adoption'
            ))
                assert.deepEqual(
                    resolveObservationPointer(input.definition, proof.locator),
                    input.definition[proof.locator.slice(1)]
                );
        }
    }
});

for (const variant of ['dispatch', 'observatory']) {
    test(`adoption 1.1 sans perte : ${variant}, maps typées, null et alias`, async (t) => {
        const fixture = await observedBackendFixture(t, variant);
        const { contract } = await compileRuntimeObservationBackend(
            fixture.options
        );
        const input = adoptionInputs(contract);
        const target = compileReferenceBackendAdoption(input);
        assert.equal(target.schema_version, '1.1.0');
        assert.deepEqual(
            withoutAdoptionDelta(target),
            withoutAdoptionDelta(contract)
        );
        assert.ok(target.models.some((model) => model.additional_properties));
        assert.deepEqual(
            target.services[0].runtime_binding,
            contract.services[0].runtime_binding
        );
        assert.ok(
            target.sources
                .slice(0, -1)
                .every((source) => source.status === 'reference')
        );
    });
}

test('adoption : le hash exact de la base est obligatoire', () => {
    const input = adoptionInputs();
    input.basisSha256 = 'b'.repeat(64);
    assert.throws(
        () => compileReferenceBackendAdoption(input),
        /^ObservationError: OBS_HASH$/
    );
});

test('adoption : refuse promotion implicite, dérive et clés héritées', () => {
    const mutations = [
        (input) => {
            input.definition.contract.status = 'implemented';
        },
        (input) => {
            input.definition.contract.status = 'verified-live';
        },
        (input) => {
            input.definition.source.authority = 'observational';
        },
        (input) => {
            input.definition.source.id = input.basis.sources[0].id;
        },
        (input) => {
            input.definition.operations = [];
        },
        (input) => {
            input.definition.decision.toString = 'PRIVATE_SENTINEL';
        },
        (input) => {
            input.definition.basis.snapshot_uri = '../escape.json';
        },
        (input) => {
            input.basis.toString = 'PRIVATE_SENTINEL';
        },
        (input) => {
            input.basis.models[0].status = 'planned';
        },
    ];
    for (const mutate of mutations) {
        const input = adoptionInputs();
        mutate(input);
        assert.throws(
            () => compileReferenceBackendAdoption(input),
            (error) => {
                assert.match(error.message, /^OBS_[A-Z]+$/);
                assert.equal(String(error).includes('PRIVATE_SENTINEL'), false);
                return true;
            }
        );
    }
    assert.throws(() => compile(adoptionInputs().definition));
});

test('adoption : le nom légitime toString reste un champ de modèle', () => {
    const reference = definition();
    reference.contract.status = 'reference';
    reference.source.authority = 'observational';
    reference.models[0].fields[0].name = 'toString';
    const basis = compile(reference);
    const target = compileReferenceBackendAdoption(adoptionInputs(basis));
    assert.equal(target.models[0].fields[0].name, 'toString');
});
