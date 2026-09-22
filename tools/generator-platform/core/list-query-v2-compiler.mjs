import { createHash } from 'node:crypto';

import { validateListQueryV2Definition } from './list-query-v2.mjs';

const CONTROLLER_STATES = [
    'idle',
    'loading',
    'success',
    'empty',
    'error',
    'reloading',
];

function fail(message) {
    throw new Error(`list-query v2 compiler: ${message}`);
}

function byId(entries, id, label) {
    const entry = entries?.find((candidate) => candidate.id === id);
    if (!entry) fail(`unresolved ${label} ${id}`);
    return entry;
}

function exactKeys(value, expected) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }
    const actual = Object.keys(value).sort();
    const sortedExpected = [...expected].sort();
    return (
        actual.length === sortedExpected.length &&
        actual.every((key, index) => key === sortedExpected[index])
    );
}

function decoderField(field) {
    if (field.type?.kind !== 'primitive') {
        fail(
            `wire field ${field.name} uses unsupported ${field.type?.kind ?? 'unknown'} type; nested models require a proven second case`
        );
    }
    return {
        name: field.name,
        type: structuredClone(field.type),
        required: field.required,
        nullable: field.nullable,
        ...(field.allowed_values
            ? { allowed_values: structuredClone(field.allowed_values) }
            : {}),
        ...(field.constraints
            ? { constraints: structuredClone(field.constraints) }
            : {}),
    };
}

function failureContract(operation, successResponse, models) {
    const envelope = successResponse.body.envelope;
    const backendDeclared =
        envelope.kind === 'object'
            ? {
                  kind: 'envelope-flag',
                  error_field: envelope.error_field,
                  message_field: envelope.message_field,
              }
            : { kind: 'none' };
    const responses = (operation.responses ?? [])
        .filter((response) => response.outcome === 'error')
        .map((response) => ({
            status: response.status,
            body_model_id: response.body?.model_id ?? null,
            body_model_kind: response.body
                ? byId(models, response.body.model_id, 'error model').kind
                : null,
        }))
        .sort((left, right) => left.status - right.status);
    return {
        invalid_payload: 'invalid-payload',
        backend_declared: backendDeclared,
        http_responses: responses,
        transport: 'host-propagated',
    };
}

function requestPolicy(operation, backendContract, execution) {
    if (operation.access.mode === 'public') {
        return {
            authentication: { mode: 'omit' },
            cache: structuredClone(execution.cache),
        };
    }
    return {
        authentication: {
            mode: 'host',
            schemes: operation.access.security_scheme_ids.map((schemeId) => {
                const scheme = byId(
                    backendContract.security_schemes,
                    schemeId,
                    'security scheme'
                );
                return { id: scheme.id, kind: scheme.kind };
            }),
        },
        cache: structuredClone(execution.cache),
    };
}

function compileQuery(definitionOperation, backendContract) {
    const operation = byId(
        backendContract.operations,
        definitionOperation.operation_ref.operation_id,
        'backend operation'
    );
    if ((operation.request?.parameters ?? []).length > 0) {
        fail(
            `${definitionOperation.id} has backend parameters; typed path/query bindings require a proven parameterized case`
        );
    }
    const response = operation.responses.find(
        (candidate) =>
            candidate.status === definitionOperation.success_response_status &&
            candidate.outcome === 'success'
    );
    if (!response?.body) {
        fail(`${definitionOperation.id} has no selected response body`);
    }
    const collection = byId(
        backendContract.models,
        response.body.model_id,
        'collection model'
    );
    if (collection.kind !== 'array' || collection.items?.kind !== 'model') {
        fail(`${definitionOperation.id} response is not a model collection`);
    }
    const wireItem = byId(
        backendContract.models,
        collection.items.model_id,
        'wire item model'
    );
    if (wireItem.kind !== 'object') {
        fail(`${definitionOperation.id} wire item is not an object`);
    }
    const wireFields = wireItem.fields.map(decoderField);
    const wireByName = new Map(wireFields.map((field) => [field.name, field]));
    const readFields = definitionOperation.read_model.fields.map((field) => {
        const source = wireByName.get(field.source_field);
        if (!source) {
            fail(
                `${definitionOperation.id}.${field.name} has unresolved source ${field.source_field}`
            );
        }
        return {
            name: field.name,
            source_field: field.source_field,
            type: structuredClone(source.type),
            required: source.required,
            nullable: source.nullable,
        };
    });
    return {
        id: definitionOperation.id,
        description: operation.description,
        port: {
            input: { kind: 'none' },
            output: {
                kind: 'list',
                item_model_id: definitionOperation.read_model.id,
            },
        },
        access: structuredClone(operation.access),
        request_policy: requestPolicy(
            operation,
            backendContract,
            definitionOperation.execution
        ),
        transport: {
            operation_id: operation.id,
            service_id: operation.service_id,
            method: operation.method,
            path: operation.path,
            success_response_status: response.status,
            media_type: response.body.media_type,
            collection_model_id: collection.id,
            envelope: structuredClone(response.body.envelope),
        },
        wire_model: {
            id: wireItem.id,
            unknown_fields: 'reject',
            fields: wireFields,
        },
        read_model: {
            id: definitionOperation.read_model.id,
            description: definitionOperation.read_model.description,
            fields: readFields,
        },
        controller: {
            initial_state: 'idle',
            states: [...CONTROLLER_STATES],
            commands: ['load', 'reload'],
            state_rules: {
                load: 'loading',
                reload: 'reloading',
                non_empty_result: 'success',
                empty_result: 'empty',
                failure: 'error',
            },
            execution: structuredClone(definitionOperation.execution),
        },
        failures: failureContract(operation, response, backendContract.models),
    };
}

export function validateListQueryV2ExecutionModel(model) {
    const errors = [];
    if (
        !exactKeys(model, [
            'schema_version',
            'kind',
            'model_id',
            'domain',
            'backend_contract',
            'queries',
        ])
    ) {
        errors.push('$: execution model must use the closed root shape');
    }
    if (model?.schema_version !== '1.0.0') {
        errors.push('$.schema_version: expected 1.0.0');
    }
    if (model?.kind !== 'list-query-execution-model') {
        errors.push('$.kind: expected list-query-execution-model');
    }
    const seen = new Set();
    for (const [index, query] of (model?.queries ?? []).entries()) {
        const path = `$.queries[${index}]`;
        if (
            !exactKeys(query, [
                'id',
                'description',
                'port',
                'access',
                'request_policy',
                'transport',
                'wire_model',
                'read_model',
                'controller',
                'failures',
            ])
        ) {
            errors.push(`${path}: query must use the closed shape`);
        }
        if (seen.has(query.id))
            errors.push(`${path}.id: duplicate ${query.id}`);
        seen.add(query.id);
        if (
            JSON.stringify(query.controller?.states) !==
            JSON.stringify(CONTROLLER_STATES)
        ) {
            errors.push(`${path}.controller.states: incomplete state contract`);
        }
        if (query.controller?.initial_state !== 'idle') {
            errors.push(`${path}.controller.initial_state: expected idle`);
        }
        if (
            !exactKeys(query.controller, [
                'initial_state',
                'states',
                'commands',
                'state_rules',
                'execution',
            ]) ||
            JSON.stringify(query.controller?.commands) !==
                JSON.stringify(['load', 'reload']) ||
            JSON.stringify(query.controller?.state_rules) !==
                JSON.stringify({
                    load: 'loading',
                    reload: 'reloading',
                    non_empty_result: 'success',
                    empty_result: 'empty',
                    failure: 'error',
                })
        ) {
            errors.push(`${path}.controller: incomplete transition contract`);
        }
        if (
            query.port?.output?.item_model_id !== query.read_model?.id ||
            query.port?.output?.kind !== 'list'
        ) {
            errors.push(`${path}.port.output: does not match read model`);
        }
        if (query.port?.input?.kind !== 'none') {
            errors.push(`${path}.port.input: unsupported input contract`);
        }
        if (query.transport?.method !== 'GET') {
            errors.push(`${path}.transport.method: list query requires GET`);
        }
        const authentication = query.request_policy?.authentication;
        if (
            (query.access?.mode === 'public' &&
                authentication?.mode !== 'omit') ||
            (query.access?.mode !== 'public' && authentication?.mode !== 'host')
        ) {
            errors.push(
                `${path}.request_policy.authentication: contradicts access`
            );
        }
        if (
            JSON.stringify(query.request_policy?.cache) !==
            JSON.stringify(query.controller?.execution?.cache)
        ) {
            errors.push(`${path}.request_policy.cache: contradicts controller`);
        }
        const wireFields = new Set(
            query.wire_model?.fields?.map((field) => field.name)
        );
        for (const [fieldIndex, field] of (
            query.read_model?.fields ?? []
        ).entries()) {
            if (!wireFields.has(field.source_field)) {
                errors.push(
                    `${path}.read_model.fields[${fieldIndex}]: unresolved wire source ${field.source_field}`
                );
            }
        }
        if (query.wire_model?.unknown_fields !== 'reject') {
            errors.push(
                `${path}.wire_model: decoder must reject unknown fields`
            );
        }
    }
    if ((model?.queries ?? []).length === 0) {
        errors.push('$.queries: requires at least one query');
    }
    return errors;
}

export function compileListQueryV2ExecutionModel({
    definition,
    backendContractDocument,
    backendContractUri,
}) {
    if (
        !Buffer.isBuffer(backendContractDocument) &&
        typeof backendContractDocument !== 'string'
    ) {
        fail('backend contract document must be bytes or text');
    }
    const backendContractSha256 = createHash('sha256')
        .update(backendContractDocument)
        .digest('hex');
    let backendContract;
    try {
        backendContract = JSON.parse(backendContractDocument.toString('utf8'));
    } catch (error) {
        fail(`backend contract is not valid JSON (${error.message})`);
    }
    const definitionErrors = validateListQueryV2Definition(
        definition,
        backendContract,
        { backendContractSha256, backendContractUri }
    );
    if (definitionErrors.length > 0) {
        fail(`invalid definition\n${definitionErrors.join('\n')}`);
    }
    const model = {
        schema_version: '1.0.0',
        kind: 'list-query-execution-model',
        model_id: `${definition.feature.id}-list-query-execution`,
        domain: structuredClone(definition.feature),
        backend_contract: structuredClone(definition.backend_contract),
        queries: definition.operations.map((operation) =>
            compileQuery(operation, backendContract)
        ),
    };
    const modelErrors = validateListQueryV2ExecutionModel(model);
    if (modelErrors.length > 0) {
        fail(`invalid compiled model\n${modelErrors.join('\n')}`);
    }
    return model;
}
