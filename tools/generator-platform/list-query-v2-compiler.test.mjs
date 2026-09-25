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
const [parameterizedDefinitionDocument, parameterizedBackendDocument] =
    await Promise.all([
        readFile(
            new URL(
                'fixtures/tasks-actions-processing-type.v2.definition.json',
                root
            )
        ),
        readFile(
            new URL(
                'fixtures/tasks-actions-processing-type.backend-contract.json',
                root
            )
        ),
    ]);
const canonicalDefinition = JSON.parse(definition.toString('utf8'));
const canonicalBackend = JSON.parse(backendDocument.toString('utf8'));
const parameterizedDefinition = JSON.parse(
    parameterizedDefinitionDocument.toString('utf8')
);
const parameterizedBackend = JSON.parse(
    parameterizedBackendDocument.toString('utf8')
);
const [usersDefinitionDocument, usersBackendDocument] = await Promise.all([
    readFile(new URL('fixtures/users-list.v2.definition.json', root)),
    readFile(new URL('fixtures/users-list.backend-contract.json', root)),
]);
const usersDefinition = JSON.parse(usersDefinitionDocument.toString('utf8'));
const usersBackend = JSON.parse(usersBackendDocument.toString('utf8'));

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

function compileParameterized(overrides = {}) {
    const backendContract = structuredClone(
        overrides.backendContract ?? parameterizedBackend
    );
    const backendContractDocument = Buffer.from(
        `${JSON.stringify(backendContract, null, 2)}\n`
    );
    const definition = structuredClone(
        overrides.definition ?? parameterizedDefinition
    );
    definition.backend_contract.sha256 = createHash('sha256')
        .update(backendContractDocument)
        .digest('hex');
    return compileListQueryV2ExecutionModel({
        definition,
        backendContractDocument,
        backendContractUri:
            'tools/generator-platform/fixtures/tasks-actions-processing-type.backend-contract.json',
    });
}

function compileUsers(overrides = {}) {
    const backendContract = structuredClone(
        overrides.backendContract ?? usersBackend
    );
    const backendContractDocument = Buffer.from(
        `${JSON.stringify(backendContract, null, 2)}\n`
    );
    const definition = structuredClone(overrides.definition ?? usersDefinition);
    definition.backend_contract.sha256 = createHash('sha256')
        .update(backendContractDocument)
        .digest('hex');
    return compileListQueryV2ExecutionModel({
        definition,
        backendContractDocument,
        backendContractUri:
            'tools/generator-platform/fixtures/users-list.backend-contract.json',
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
        parameters: [],
        result: { kind: 'list' },
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

test('compile le cas réel avec un path lié et un tableau enum imbriqué', () => {
    const query = compileParameterized().queries[0];

    assert.deepEqual(query.port.input, {
        kind: 'object',
        fields: [
            {
                name: 'reportUniqId',
                type: { kind: 'primitive', name: 'string' },
                required: true,
                constraints: { min_length: 1 },
            },
        ],
    });
    assert.deepEqual(query.transport.parameters, [
        {
            name: 'id',
            in: 'path',
            source_field: 'reportUniqId',
            type: { kind: 'primitive', name: 'string' },
            required: true,
            constraints: { min_length: 1 },
        },
    ]);
    assert.deepEqual(query.wire_model.fields[2], {
        name: 'operators',
        type: {
            kind: 'array',
            items: { kind: 'primitive', name: 'string' },
        },
        required: true,
        nullable: false,
        allowed_values: ['mtn', 'orange', 'moov'],
    });
    assert.deepEqual(
        query.read_model.fields.map(({ name, source_field, type }) => ({
            name,
            source_field,
            type,
        })),
        [
            {
                name: 'value',
                source_field: 'code',
                type: { kind: 'primitive', name: 'string' },
            },
            {
                name: 'label',
                source_field: 'name',
                type: { kind: 'primitive', name: 'string' },
            },
            {
                name: 'operators',
                source_field: 'operators',
                type: {
                    kind: 'array',
                    items: { kind: 'primitive', name: 'string' },
                },
            },
        ]
    );
});

test('compile C5 users en page typée avec cinq query parameters', () => {
    const first = compileUsers();
    const second = compileUsers();
    const query = first.queries[0];

    assert.deepEqual(first, second);
    assert.equal(first.schema_version, '1.2.0');
    assert.deepEqual(query.port.input, {
        kind: 'object',
        fields: [
            {
                name: 'page',
                type: { kind: 'primitive', name: 'integer' },
                required: true,
                constraints: { minimum: 1 },
            },
            {
                name: 'search',
                type: { kind: 'primitive', name: 'string' },
                required: false,
                constraints: { min_length: 1 },
            },
            {
                name: 'profile',
                type: { kind: 'primitive', name: 'string' },
                required: false,
                constraints: { min_length: 1 },
            },
            {
                name: 'role',
                type: { kind: 'primitive', name: 'string' },
                required: false,
                constraints: { pattern: '^(supervisor|team-leader|agent)$' },
            },
            {
                name: 'isActive',
                type: { kind: 'primitive', name: 'boolean' },
                required: false,
            },
        ],
    });
    assert.deepEqual(query.port.output, {
        kind: 'page',
        item_model_id: 'user-list-item',
        page_model_id: 'users-list-page-wire',
    });
    assert.deepEqual(
        query.transport.parameters.map(
            ({ name, in: location, source_field, type, required }) => ({
                name,
                in: location,
                source_field,
                type,
                required,
            })
        ),
        [
            {
                name: 'page',
                in: 'query',
                source_field: 'page',
                type: { kind: 'primitive', name: 'integer' },
                required: true,
            },
            {
                name: 'search',
                in: 'query',
                source_field: 'search',
                type: { kind: 'primitive', name: 'string' },
                required: false,
            },
            {
                name: 'profile',
                in: 'query',
                source_field: 'profile',
                type: { kind: 'primitive', name: 'string' },
                required: false,
            },
            {
                name: 'role',
                in: 'query',
                source_field: 'role',
                type: { kind: 'primitive', name: 'string' },
                required: false,
            },
            {
                name: 'is_active',
                in: 'query',
                source_field: 'isActive',
                type: { kind: 'primitive', name: 'boolean' },
                required: false,
            },
        ]
    );
    assert.deepEqual(query.transport.result, {
        kind: 'page',
        page_model_id: 'users-list-page-wire',
        items_field: 'data',
        page_fields: {
            currentPage: {
                source_field: 'current_page',
                type: 'integer',
            },
            lastPage: { source_field: 'last_page', type: 'integer' },
            pageSize: { source_field: 'per_page', type: 'integer' },
            totalItems: { source_field: 'total', type: 'integer' },
        },
    });
    assert.deepEqual(validateListQueryV2ExecutionModel(first), []);
});

test('reste indépendant du framework backend et canonicalise ses noms wire', () => {
    const backendContract = structuredClone(usersBackend);
    const definition = structuredClone(usersDefinition);
    const pageModel = backendContract.models.find(
        (model) => model.id === 'users-list-page-wire'
    );
    const wireNames = new Map([
        ['data', 'content'],
        ['current_page', 'number'],
        ['last_page', 'totalPages'],
        ['per_page', 'size'],
        ['total', 'totalElements'],
    ]);
    for (const field of pageModel.fields) {
        field.name = wireNames.get(field.name) ?? field.name;
    }
    definition.operations[0].result = {
        kind: 'page',
        items_field: 'content',
        page_fields: {
            currentPage: 'number',
            lastPage: 'totalPages',
            pageSize: 'size',
            totalItems: 'totalElements',
        },
    };
    const activeParameter =
        backendContract.operations[0].request.parameters.find(
            (parameter) => parameter.name === 'is_active'
        );
    activeParameter.name = 'filter.is-active';
    definition.operations[0].input.fields.find(
        (field) => field.name === 'isActive'
    ).parameter_ref.name = 'filter.is-active';

    const query = compileUsers({ backendContract, definition }).queries[0];

    assert.equal(query.transport.result.items_field, 'content');
    assert.deepEqual(query.transport.result.page_fields, {
        currentPage: { source_field: 'number', type: 'integer' },
        lastPage: { source_field: 'totalPages', type: 'integer' },
        pageSize: { source_field: 'size', type: 'integer' },
        totalItems: { source_field: 'totalElements', type: 'integer' },
    });
    assert.equal(query.transport.parameters.at(-1).name, 'filter.is-active');
    assert.doesNotMatch(
        JSON.stringify(query),
        /laravel|spring|django|aspnet|dotnet/i
    );
});

test('refuse les pages ambiguës et les query parameters hors périmètre C5', () => {
    const wrongPage = structuredClone(usersBackend);
    const pageModel = wrongPage.models.find(
        (model) => model.id === 'users-list-page-wire'
    );
    pageModel.fields.find((field) => field.name === 'total').type = {
        kind: 'primitive',
        name: 'string',
    };
    assert.throws(
        () => compileUsers({ backendContract: wrongPage }),
        /total must be a required non-null integer/
    );

    const unsupportedQuery = structuredClone(usersBackend);
    unsupportedQuery.operations[0].request.parameters.find(
        (parameter) => parameter.name === 'is_active'
    ).type = { kind: 'primitive', name: 'number' };
    assert.throws(
        () => compileUsers({ backendContract: unsupportedQuery }),
        /only the proven path or typed query shapes are accepted/
    );

    const duplicatePageField = structuredClone(usersDefinition);
    duplicatePageField.operations[0].result.page_fields.totalItems = 'per_page';
    assert.throws(
        () => compileUsers({ definition: duplicatePageField }),
        /page_fields: fields must be distinct/
    );
});

test('le validateur tue les mutants de page et de paramètres query', () => {
    const model = compileUsers();

    const duplicatePageSource = structuredClone(model);
    duplicatePageSource.queries[0].transport.result.page_fields.totalItems = {
        source_field: 'per_page',
        type: 'integer',
    };
    assert.match(
        validateListQueryV2ExecutionModel(duplicatePageSource).join('\n'),
        /port\.output: does not match read model/
    );

    const duplicateQuerySource = structuredClone(model);
    duplicateQuerySource.queries[0].transport.parameters[1].source_field =
        'page';
    assert.match(
        validateListQueryV2ExecutionModel(duplicateQuerySource).join('\n'),
        /must match port input fields/
    );

    const openBinding = structuredClone(model);
    openBinding.queries[0].transport.parameters[0].serializer = 'invented';
    assert.match(
        validateListQueryV2ExecutionModel(openBinding).join('\n'),
        /invalid query binding page/
    );
});

test('refuse une liaison path absente, renommée ou élargie hors forme prouvée', () => {
    const absent = structuredClone(parameterizedDefinition);
    delete absent.operations[0].input;
    assert.throws(
        () => compileParameterized({ definition: absent }),
        /path:id requires exactly one input binding/
    );

    const renamed = structuredClone(parameterizedDefinition);
    renamed.operations[0].input.fields[0].parameter_ref.name = 'other';
    assert.throws(
        () => compileParameterized({ definition: renamed }),
        /unresolved backend parameter path:other/
    );

    const twoParameters = structuredClone(parameterizedBackend);
    twoParameters.operations[0].path =
        '/processing-actions/{id}/{kind}/report-types';
    twoParameters.operations[0].request.parameters.push({
        ...structuredClone(twoParameters.operations[0].request.parameters[0]),
        name: 'kind',
    });
    const twoInputs = structuredClone(parameterizedDefinition);
    twoInputs.operations[0].input.fields.push({
        name: 'kind',
        parameter_ref: { name: 'kind', in: 'path' },
    });
    assert.throws(
        () =>
            compileParameterized({
                backendContract: twoParameters,
                definition: twoInputs,
            }),
        /only one required string path parameter or a query-only input is proven/
    );

    const repeatedPlaceholder = structuredClone(parameterizedBackend);
    repeatedPlaceholder.operations[0].path =
        '/processing-actions/{id}/report-types/{id}';
    assert.throws(
        () =>
            compileParameterized({
                backendContract: repeatedPlaceholder,
            }),
        /only the proven path or typed query shapes are accepted/
    );
});

test('refuse les objets et tableaux récursifs au-delà du cas imbriqué prouvé', () => {
    const objectArray = structuredClone(parameterizedBackend);
    objectArray.models[0].fields[2].type.items = {
        kind: 'model',
        model_id: 'tasks-actions-processing-type-wire',
    };
    delete objectArray.models[0].fields[2].allowed_values;
    assert.throws(
        () => compileParameterized({ backendContract: objectArray }),
        /requires the proven enum string-array shape/
    );

    const nestedArray = structuredClone(parameterizedBackend);
    nestedArray.models[0].fields[2].type.items = {
        kind: 'array',
        items: { kind: 'primitive', name: 'string' },
    };
    delete nestedArray.models[0].fields[2].allowed_values;
    assert.throws(
        () => compileParameterized({ backendContract: nestedArray }),
        /requires the proven enum string-array shape/
    );

    const openStringArray = structuredClone(parameterizedBackend);
    delete openStringArray.models[0].fields[2].allowed_values;
    assert.throws(
        () => compileParameterized({ backendContract: openStringArray }),
        /requires the proven enum string-array shape/
    );
});

test('le validateur tue les mutants de binding path et de tableau enum', () => {
    const model = compileParameterized();

    const driftedInput = structuredClone(model);
    driftedInput.queries[0].port.input.fields[0].constraints = {
        min_length: 2,
    };
    assert.match(
        validateListQueryV2ExecutionModel(driftedInput).join('\n'),
        /invalid path binding id/
    );

    const unboundPath = structuredClone(model);
    unboundPath.queries[0].transport.path = '/processing-actions/report-types';
    assert.match(
        validateListQueryV2ExecutionModel(unboundPath).join('\n'),
        /invalid path binding id/
    );

    const repeatedPlaceholder = structuredClone(model);
    repeatedPlaceholder.queries[0].transport.path =
        '/processing-actions/{id}/report-types/{id}';
    assert.match(
        validateListQueryV2ExecutionModel(repeatedPlaceholder).join('\n'),
        /invalid path binding id/
    );

    const openArray = structuredClone(model);
    delete openArray.queries[0].wire_model.fields[2].allowed_values;
    assert.match(
        validateListQueryV2ExecutionModel(openArray).join('\n'),
        /unsupported nested decoder shape/
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

test('refuse les paramètres non liés et les modèles imbriqués non prouvés', () => {
    const parameterized = structuredClone(canonicalBackend);
    parameterized.operations[0].request.parameters.push({ id: 'site-id' });
    assert.throws(
        () => compile({ backendContract: parameterized }),
        /requires exactly one input binding/
    );

    const nested = structuredClone(canonicalBackend);
    nested.models[0].fields[0].type = {
        kind: 'model',
        model_id: 'home-block-info-wire',
    };
    assert.throws(
        () => compile({ backendContract: nested }),
        /only one-dimensional primitive arrays are proven/
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
