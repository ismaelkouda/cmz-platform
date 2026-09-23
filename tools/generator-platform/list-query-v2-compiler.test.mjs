import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
    compileListQueryV2ExecutionModel,
    validateListQueryV2ExecutionModel,
} from './core/list-query-v2-compiler.mjs';

const root = new URL('./', import.meta.url);
const backendUri =
    'tools/generator-platform/fixtures/list-query-v1.backend-contract.json';
const [definition, backendDocument] = await Promise.all([
    readFile(new URL('fixtures/editorial-blocks.v2.definition.json', root)),
    readFile(new URL('fixtures/list-query-v1.backend-contract.json', root)),
]);
const canonicalDefinition = JSON.parse(definition.toString('utf8'));
const canonicalBackend = JSON.parse(backendDocument.toString('utf8'));

function compile(overrides = {}) {
    const backendContract = overrides.backendContract ?? canonicalBackend;
    const backendContractDocument = overrides.backendContract
        ? Buffer.from(`${JSON.stringify(backendContract, null, 2)}\n`)
        : backendDocument;
    const definition = structuredClone(
        overrides.definition ?? canonicalDefinition
    );
    definition.backend_contract.sha256 = createHash('sha256')
        .update(backendContractDocument)
        .digest('hex');
    return compileListQueryV2ExecutionModel({
        definition,
        backendContractDocument,
        backendContractUri: backendUri,
    });
}

test('compile un contrat v2 en modèle d’exécution neutre et déterministe', () => {
    const definitionBefore = structuredClone(canonicalDefinition);
    const backendBefore = structuredClone(canonicalBackend);
    const first = compile();
    const second = compile();

    assert.deepEqual(first, second);
    assert.deepEqual(canonicalDefinition, definitionBefore);
    assert.deepEqual(canonicalBackend, backendBefore);
    assert.deepEqual(validateListQueryV2ExecutionModel(first), []);
    assert.equal(first.kind, 'list-query-execution-model');
    assert.equal(first.queries.length, 1);

    const query = first.queries[0];
    assert.deepEqual(query.port, {
        input: { kind: 'none' },
        output: { kind: 'list', item_model_id: 'home-block-info' },
    });
    assert.deepEqual(query.request_policy, {
        authentication: { mode: 'omit' },
        cache: { mode: 'host', scope: 'public', refresh: 'bypass' },
    });
    assert.deepEqual(query.transport, {
        operation_id: 'cms.list-home-block-infos',
        service_id: 'settings-api',
        method: 'GET',
        path: '/cms/home-block-infos/actives/pwa',
        success_response_status: 200,
        media_type: 'application/json',
        collection_model_id: 'home-block-info-list-wire',
        envelope: {
            kind: 'object',
            data_field: 'data',
            error_field: 'error',
            message_field: 'message',
        },
    });
    assert.deepEqual(query.wire_model.fields, [
        {
            name: 'id',
            type: { kind: 'primitive', name: 'integer' },
            required: true,
            nullable: false,
        },
        {
            name: 'title',
            type: { kind: 'primitive', name: 'string' },
            required: true,
            nullable: false,
        },
    ]);
    assert.deepEqual(query.read_model.fields, [
        {
            name: 'id',
            source_field: 'id',
            type: { kind: 'primitive', name: 'integer' },
            required: true,
            nullable: false,
        },
        {
            name: 'title',
            source_field: 'title',
            type: { kind: 'primitive', name: 'string' },
            required: true,
            nullable: false,
        },
    ]);
    assert.deepEqual(query.controller.states, [
        'idle',
        'loading',
        'success',
        'empty',
        'error',
        'reloading',
    ]);
    assert.deepEqual(query.controller.commands, ['load', 'reload']);
    assert.deepEqual(query.controller.state_rules, {
        load: 'loading',
        reload: 'reloading',
        non_empty_result: 'success',
        empty_result: 'empty',
        failure: 'error',
    });
    assert.equal(query.wire_model.unknown_fields, 'reject');
    assert.doesNotMatch(
        JSON.stringify(first),
        /angular|react|rxjs|seos|httpclient|httpcontext/i
    );
});

test('calcule l’empreinte sur les octets réellement compilés', () => {
    const changedBytes = Buffer.concat([backendDocument, Buffer.from(' ')]);
    assert.throws(
        () =>
            compileListQueryV2ExecutionModel({
                definition: canonicalDefinition,
                backendContractDocument: changedBytes,
                backendContractUri: backendUri,
            }),
        /sha256: does not match backend bytes/
    );
});

test('conserve séparément le DTO wire et le read model renommé', () => {
    const definition = structuredClone(canonicalDefinition);
    const backendContract = structuredClone(canonicalBackend);
    const item = backendContract.models.find(
        (model) => model.id === 'home-block-info-wire'
    );
    item.fields.push({
        name: 'description',
        description: 'Wire-only description.',
        required: true,
        nullable: false,
        type: { kind: 'primitive', name: 'string' },
        evidence: item.fields[0].evidence,
    });
    definition.operations[0].read_model = {
        id: 'select-option',
        description: 'Generic select option.',
        fields: [
            { name: 'value', source_field: 'id' },
            { name: 'label', source_field: 'title' },
        ],
    };
    const model = compile({ definition, backendContract });
    const query = model.queries[0];
    assert.deepEqual(
        query.wire_model.fields.map((field) => field.name),
        ['id', 'title', 'description']
    );
    assert.deepEqual(
        query.read_model.fields.map(({ name, source_field }) => ({
            name,
            source_field,
        })),
        [
            { name: 'value', source_field: 'id' },
            { name: 'label', source_field: 'title' },
        ]
    );
});

test('résout une query authentifiée vers le schéma exact fourni par le host', () => {
    const definition = structuredClone(canonicalDefinition);
    const backendContract = structuredClone(canonicalBackend);
    backendContract.security_schemes.push({
        id: 'session-bearer',
        kind: 'bearer',
        status: 'planned',
        description: 'Host session bearer.',
        evidence: backendContract.services[0].evidence,
    });
    backendContract.operations[0].access = {
        mode: 'authenticated',
        security_scheme_ids: ['session-bearer'],
        permissions: [],
    };
    definition.operations[0].execution.cache.scope = 'principal';
    const query = compile({ definition, backendContract }).queries[0];
    assert.deepEqual(query.request_policy, {
        authentication: {
            mode: 'host',
            schemes: [{ id: 'session-bearer', kind: 'bearer' }],
        },
        cache: { mode: 'host', scope: 'principal', refresh: 'bypass' },
    });
});

test('projette les échecs backend sans inventer leur modèle métier', () => {
    const backendContract = structuredClone(canonicalBackend);
    backendContract.operations[0].responses.push({
        status: 422,
        outcome: 'error',
        description: 'Rejected request.',
        body: {
            media_type: 'application/json',
            model_id: 'home-block-info-wire',
            envelope: { kind: 'none' },
            evidence: backendContract.operations[0].responses[0].body.evidence,
        },
        evidence: backendContract.operations[0].responses[0].evidence,
    });
    const failures = compile({ backendContract }).queries[0].failures;
    assert.deepEqual(failures, {
        invalid_payload: 'invalid-payload',
        backend_declared: {
            kind: 'envelope-flag',
            error_field: 'error',
            message_field: 'message',
        },
        http_responses: [
            {
                status: 422,
                body_model_id: 'home-block-info-wire',
                body_model_kind: 'object',
            },
        ],
        transport: 'host-propagated',
    });
});

test('refuse paramètres et modèles imbriqués tant que leurs cas ne sont pas prouvés', () => {
    const parameterized = structuredClone(canonicalBackend);
    parameterized.operations[0].request.parameters.push({ id: 'site-id' });
    assert.throws(
        () => compile({ backendContract: parameterized }),
        /typed path\/query bindings require a proven parameterized case/
    );

    const nested = structuredClone(canonicalBackend);
    nested.models[0].fields[0].type = {
        kind: 'model',
        model_id: 'home-block-info-wire',
    };
    assert.throws(
        () => compile({ backendContract: nested }),
        /nested models require a proven second case/
    );
});

test('le validateur tue les mutants de contrôleur, mapping et décodage', () => {
    const model = compile();

    const missingState = structuredClone(model);
    missingState.queries[0].controller.states.splice(3, 1);
    assert.match(
        validateListQueryV2ExecutionModel(missingState).join('\n'),
        /incomplete state contract/
    );

    const inventedCancel = structuredClone(model);
    inventedCancel.queries[0].controller.commands.push('cancel');
    assert.match(
        validateListQueryV2ExecutionModel(inventedCancel).join('\n'),
        /incomplete transition contract/
    );

    const wrongOutput = structuredClone(model);
    wrongOutput.queries[0].port.output.item_model_id = 'other';
    assert.match(
        validateListQueryV2ExecutionModel(wrongOutput).join('\n'),
        /does not match read model/
    );

    const leakedAuthentication = structuredClone(model);
    leakedAuthentication.queries[0].request_policy.authentication = {
        mode: 'host',
        schemes: [{ id: 'session', kind: 'bearer' }],
    };
    assert.match(
        validateListQueryV2ExecutionModel(leakedAuthentication).join('\n'),
        /authentication: contradicts access/
    );

    const cacheDrift = structuredClone(model);
    cacheDrift.queries[0].request_policy.cache = { mode: 'bypass' };
    assert.match(
        validateListQueryV2ExecutionModel(cacheDrift).join('\n'),
        /cache: contradicts controller/
    );

    const unknownSource = structuredClone(model);
    unknownSource.queries[0].read_model.fields[0].source_field = 'missing';
    assert.match(
        validateListQueryV2ExecutionModel(unknownSource).join('\n'),
        /unresolved wire source missing/
    );

    const permissiveDecoder = structuredClone(model);
    permissiveDecoder.queries[0].wire_model.unknown_fields = 'allow';
    assert.match(
        validateListQueryV2ExecutionModel(permissiveDecoder).join('\n'),
        /decoder must reject unknown fields/
    );
});
