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
const FIELD_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
const WIRE_NAME = /^[A-Za-z_][A-Za-z0-9_.-]*$/;

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

function occurrenceCount(value, token) {
    return value.split(token).length - 1;
}

function decoderType(type, fieldName) {
    if (type?.kind === 'primitive') return structuredClone(type);
    if (type?.kind === 'array' && type.items?.kind === 'primitive') {
        return {
            kind: 'array',
            items: structuredClone(type.items),
        };
    }
    fail(
        `wire field ${fieldName} uses unsupported ${type?.kind ?? 'unknown'} type; only one-dimensional primitive arrays are proven`
    );
}

function decoderField(field) {
    if (!field.type) {
        fail(`wire field ${field.name} has no decodable type`);
    }
    if (
        field.type.kind === 'array' &&
        (field.type.items?.kind !== 'primitive' ||
            field.type.items.name !== 'string' ||
            !Array.isArray(field.allowed_values) ||
            field.allowed_values.length === 0 ||
            field.allowed_values.some((value) => typeof value !== 'string'))
    ) {
        fail(
            `wire field ${field.name} requires the proven enum string-array shape`
        );
    }
    return {
        name: field.name,
        type: decoderType(field.type, field.name),
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

function supportedQueryParameter(parameter) {
    if (
        parameter.type?.kind !== 'primitive' ||
        !['boolean', 'integer', 'string'].includes(parameter.type.name)
    ) {
        return false;
    }
    const allowedConstraintKeys =
        parameter.type.name === 'string'
            ? ['max_length', 'min_length', 'pattern']
            : parameter.type.name === 'integer'
              ? ['maximum', 'minimum']
              : [];
    return Object.keys(parameter.constraints ?? {}).every((key) =>
        allowedConstraintKeys.includes(key)
    );
}

function compileInput(definitionOperation, operation) {
    const parameters = operation.request?.parameters ?? [];
    if (parameters.length === 0) {
        return {
            portInput: { kind: 'none' },
            parameterBindings: [],
        };
    }
    const pathParameters = parameters.filter(
        (parameter) => parameter.in === 'path'
    );
    if (
        pathParameters.length > 1 ||
        (pathParameters.length === 1 && parameters.length !== 1)
    ) {
        fail(
            `${definitionOperation.id} requires unsupported parameters; only one required string path parameter or a query-only input is proven`
        );
    }
    const fields = definitionOperation.input?.fields ?? [];
    const parameterBindings = fields.map((field) => {
        const parameter = parameters.find(
            (candidate) =>
                candidate.in === field.parameter_ref.in &&
                candidate.name === field.parameter_ref.name
        );
        if (!parameter) {
            fail(
                `${definitionOperation.id}.${field.name} references an unresolved backend parameter`
            );
        }
        const supportedPath =
            parameter.in === 'path' &&
            parameter.required === true &&
            parameter.type?.kind === 'primitive' &&
            parameter.type.name === 'string' &&
            JSON.stringify(parameter.constraints ?? {}) ===
                JSON.stringify({ min_length: 1 }) &&
            occurrenceCount(operation.path, `{${parameter.name}}`) === 1;
        const supportedQuery =
            parameter.in === 'query' &&
            occurrenceCount(operation.path, `{${parameter.name}}`) === 0 &&
            supportedQueryParameter(parameter);
        if (!supportedPath && !supportedQuery) {
            fail(
                `${definitionOperation.id}.${field.name} requires an unsupported parameter; only the proven path or typed query shapes are accepted`
            );
        }
        return {
            name: parameter.name,
            in: parameter.in,
            source_field: field.name,
            type: structuredClone(parameter.type),
            required: parameter.required,
            ...(parameter.constraints
                ? { constraints: structuredClone(parameter.constraints) }
                : {}),
        };
    });
    return {
        portInput: {
            kind: 'object',
            fields: parameterBindings.map((binding) => ({
                name: binding.source_field,
                type: structuredClone(binding.type),
                required: binding.required,
                ...(binding.constraints
                    ? { constraints: structuredClone(binding.constraints) }
                    : {}),
            })),
        },
        parameterBindings,
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
    const { portInput, parameterBindings } = compileInput(
        definitionOperation,
        operation
    );
    const response = operation.responses.find(
        (candidate) =>
            candidate.status === definitionOperation.success_response_status &&
            candidate.outcome === 'success'
    );
    if (!response?.body) {
        fail(`${definitionOperation.id} has no selected response body`);
    }
    const responseModel = byId(
        backendContract.models,
        response.body.model_id,
        'response model'
    );
    let collection = responseModel;
    let result = { kind: 'list' };
    if (definitionOperation.result?.kind === 'page') {
        if (responseModel.kind !== 'object') {
            fail(`${definitionOperation.id} response is not a page object`);
        }
        const itemsField = responseModel.fields?.find(
            (field) => field.name === definitionOperation.result.items_field
        );
        if (itemsField?.type?.kind !== 'model') {
            fail(
                `${definitionOperation.id} page items do not reference a collection model`
            );
        }
        collection = byId(
            backendContract.models,
            itemsField.type.model_id,
            'page collection model'
        );
        result = {
            kind: 'page',
            page_model_id: responseModel.id,
            items_field: definitionOperation.result.items_field,
            page_fields: Object.fromEntries(
                Object.entries(definitionOperation.result.page_fields).map(
                    ([name, sourceField]) => [
                        name,
                        { source_field: sourceField, type: 'integer' },
                    ]
                )
            ),
        };
    }
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
            input: portInput,
            output:
                result.kind === 'page'
                    ? {
                          kind: 'page',
                          item_model_id: definitionOperation.read_model.id,
                          page_model_id: result.page_model_id,
                      }
                    : {
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
            parameters: parameterBindings,
            result,
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
    if (model?.schema_version !== '1.2.0') {
        errors.push('$.schema_version: expected 1.2.0');
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
        const result = query.transport?.result;
        const output = query.port?.output;
        const validListOutput =
            result?.kind === 'list' &&
            exactKeys(result, ['kind']) &&
            output?.kind === 'list' &&
            exactKeys(output, ['kind', 'item_model_id']);
        const validPageOutput =
            result?.kind === 'page' &&
            exactKeys(result, [
                'kind',
                'page_model_id',
                'items_field',
                'page_fields',
            ]) &&
            typeof result.page_model_id === 'string' &&
            result.page_model_id.length > 0 &&
            typeof result.items_field === 'string' &&
            WIRE_NAME.test(result.items_field) &&
            exactKeys(result.page_fields, [
                'currentPage',
                'lastPage',
                'pageSize',
                'totalItems',
            ]) &&
            Object.values(result.page_fields).every(
                (field) =>
                    exactKeys(field, ['source_field', 'type']) &&
                    typeof field.source_field === 'string' &&
                    WIRE_NAME.test(field.source_field) &&
                    field.type === 'integer'
            ) &&
            new Set(
                Object.values(result.page_fields).map(
                    (field) => field.source_field
                )
            ).size === 4 &&
            output?.kind === 'page' &&
            exactKeys(output, ['kind', 'item_model_id', 'page_model_id']) &&
            output.page_model_id === result.page_model_id;
        if (
            output?.item_model_id !== query.read_model?.id ||
            (!validListOutput && !validPageOutput)
        ) {
            errors.push(`${path}.port.output: does not match read model`);
        }
        const input = query.port?.input;
        const parameterBindings = query.transport?.parameters;
        if (input?.kind === 'none') {
            if (
                !exactKeys(input, ['kind']) ||
                !Array.isArray(parameterBindings) ||
                parameterBindings.length
            ) {
                errors.push(
                    `${path}.transport.parameters: parameterless port must have no bindings`
                );
            }
        } else if (input?.kind === 'object' && Array.isArray(input.fields)) {
            const inputNames = new Set(input.fields.map((field) => field.name));
            const bindingNames = new Set(
                (parameterBindings ?? []).map(
                    (binding) => `${binding.in}:${binding.name}`
                )
            );
            const bindingSources = new Set(
                (parameterBindings ?? []).map((binding) => binding.source_field)
            );
            if (
                !exactKeys(input, ['kind', 'fields']) ||
                !Array.isArray(parameterBindings) ||
                input.fields.length !== parameterBindings.length ||
                inputNames.size !== input.fields.length ||
                bindingNames.size !== parameterBindings.length ||
                bindingSources.size !== parameterBindings.length
            ) {
                errors.push(
                    `${path}.transport.parameters: must match port input fields`
                );
            }
            const pathBindings = (parameterBindings ?? []).filter(
                (binding) => binding.in === 'path'
            );
            if (
                pathBindings.length > 1 ||
                (pathBindings.length === 1 && parameterBindings.length !== 1)
            ) {
                errors.push(
                    `${path}.transport.parameters: path and query parameters cannot be combined`
                );
            }
            for (const binding of parameterBindings ?? []) {
                const inputField = input.fields.find(
                    (field) => field.name === binding.source_field
                );
                const bindingKeys = [
                    'name',
                    'in',
                    'source_field',
                    'type',
                    'required',
                    ...(binding.constraints ? ['constraints'] : []),
                ];
                const inputFieldKeys = [
                    'name',
                    'type',
                    'required',
                    ...(inputField?.constraints ? ['constraints'] : []),
                ];
                const validPath =
                    binding.in === 'path' &&
                    binding.required === true &&
                    binding.type?.kind === 'primitive' &&
                    binding.type.name === 'string' &&
                    occurrenceCount(
                        query.transport.path,
                        `{${binding.name}}`
                    ) === 1 &&
                    JSON.stringify(binding.constraints ?? {}) ===
                        JSON.stringify({ min_length: 1 });
                const validQuery =
                    binding.in === 'query' &&
                    occurrenceCount(
                        query.transport.path,
                        `{${binding.name}}`
                    ) === 0 &&
                    supportedQueryParameter(binding);
                if (
                    !exactKeys(binding, bindingKeys) ||
                    !exactKeys(inputField, inputFieldKeys) ||
                    typeof binding.name !== 'string' ||
                    typeof binding.source_field !== 'string' ||
                    !WIRE_NAME.test(binding.name) ||
                    !FIELD_NAME.test(binding.source_field) ||
                    typeof binding.required !== 'boolean' ||
                    (!validPath && !validQuery) ||
                    !inputNames.has(binding.source_field) ||
                    JSON.stringify(inputField?.type) !==
                        JSON.stringify(binding.type) ||
                    inputField?.required !== binding.required ||
                    JSON.stringify(inputField?.constraints ?? {}) !==
                        JSON.stringify(binding.constraints ?? {})
                ) {
                    errors.push(
                        `${path}.transport.parameters: invalid ${binding.in} binding ${binding.name}`
                    );
                }
            }
        } else {
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
        for (const field of query.wire_model?.fields ?? []) {
            if (
                field.type?.kind === 'array' &&
                (field.type.items?.kind !== 'primitive' ||
                    field.type.items.name !== 'string' ||
                    !Array.isArray(field.allowed_values) ||
                    field.allowed_values.length === 0 ||
                    field.allowed_values.some(
                        (value) => typeof value !== 'string'
                    ))
            ) {
                errors.push(
                    `${path}.wire_model.${field.name}: unsupported nested decoder shape`
                );
            }
        }
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
        schema_version: '1.2.0',
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
