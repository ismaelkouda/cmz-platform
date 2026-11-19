import { createHash } from 'node:crypto';

import { validateActionRequestV2Definition } from './action-request-v2.mjs';
import {
    projectActionGraphField,
    projectActionResultGraph,
    validateActionGraphBindings,
} from './action-request-result-graph.mjs';
import { observationInputPrimitives as observationIO } from './runtime-observation-evidence.mjs';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const CONTROLLER_STATES = [
    'idle',
    'submitting',
    'applying-post-success',
    'success',
    'error',
    'committed-with-local-error',
];

function fail(message) {
    throw new Error(`action-request v2 compiler: ${message}`);
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

function closedKeys(value, required, optional = []) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }
    const allowed = new Set([...required, ...optional]);
    return (
        required.every((key) => Object.hasOwn(value, key)) &&
        Object.keys(value).every((key) => allowed.has(key))
    );
}

function byId(entries, id, label) {
    const entry = entries?.find((candidate) => candidate.id === id);
    if (!entry) fail(`unresolved ${label} ${id}`);
    return entry;
}

function primitiveField(field, label) {
    if (field.type?.kind !== 'primitive') {
        fail(`${label} ${field.name} is not a proven primitive field`);
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

function requestPolicy(operation, backendContract, execution) {
    const authentication =
        operation.access.mode === 'public'
            ? { mode: 'omit' }
            : {
                  mode: 'host',
                  schemes: operation.access.security_scheme_ids.map(
                      (schemeId) => {
                          const scheme = byId(
                              backendContract.security_schemes,
                              schemeId,
                              'security scheme'
                          );
                          return { id: scheme.id, kind: scheme.kind };
                      }
                  ),
              };
    return {
        authentication,
        idempotency: structuredClone(execution.idempotency),
    };
}

function failureContract(
    operation,
    successResponse,
    models,
    execution,
    graphMode = false
) {
    const envelope = successResponse.body.envelope;
    const backendDeclared =
        envelope.kind === 'object' || envelope.kind === 'status-object'
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
            ...(graphMode
                ? { envelope: structuredClone(response.body?.envelope ?? null) }
                : {}),
        }))
        .sort((left, right) => left.status - right.status);
    return {
        invalid_input: 'invalid-input',
        invalid_response: 'invalid-response',
        backend_declared: backendDeclared,
        http_responses: responses,
        transport: graphMode ? 'typed-bounded' : 'host-propagated',
        post_success:
            execution.post_success.mode === 'host'
                ? {
                      mode: 'host-propagated',
                      failure_state: 'committed-with-local-error',
                  }
                : { mode: 'none' },
    };
}

function controller(execution) {
    const hasPostSuccess = execution?.post_success?.mode === 'host';
    return {
        initial_state: 'idle',
        states: [...CONTROLLER_STATES],
        commands: hasPostSuccess
            ? ['submit', 'retry-post-success']
            : ['submit'],
        state_rules: {
            submit: 'submitting',
            remote_failure: 'error',
            remote_success: hasPostSuccess
                ? 'applying-post-success'
                : 'success',
            post_success_success: hasPostSuccess ? 'success' : 'not-applicable',
            post_success_failure: hasPostSuccess
                ? 'committed-with-local-error'
                : 'not-applicable',
            retry_post_success: hasPostSuccess
                ? 'applying-post-success'
                : 'not-applicable',
        },
        commit_boundary: {
            event: 'remote-success',
            retry_remote_after_commit: 'forbidden',
        },
        execution: structuredClone(execution),
    };
}

function compileAction(definitionAction, backendContract, graphMode = false) {
    const operation = byId(
        backendContract.operations,
        definitionAction.operation_ref.operation_id,
        'backend operation'
    );
    const requestBody = operation.request.body;
    const requestWireModel = requestBody
        ? byId(backendContract.models, requestBody.model_id, 'request model')
        : { id: null, fields: [] };
    const response = operation.responses.find(
        (candidate) =>
            candidate.status === definitionAction.success_response_status &&
            candidate.outcome === 'success'
    );
    if (!response?.body) {
        fail(`${definitionAction.id} has no selected response body`);
    }
    const responseWireModel = byId(
        backendContract.models,
        response.body.model_id,
        'response model'
    );
    const requestWireFields = requestWireModel.fields.map((field) =>
        primitiveField(field, 'request wire field')
    );
    const requestWireByName = new Map(
        requestWireFields.map((field) => [field.name, field])
    );
    const inputFields = definitionAction.input.fields.map((field) => {
        const wireField = requestWireByName.get(field.body_field);
        if (!wireField) {
            fail(
                `${definitionAction.id}.${field.name} has unresolved request field ${field.body_field}`
            );
        }
        return {
            name: field.name,
            type: structuredClone(wireField.type),
            required: wireField.required,
            nullable: wireField.nullable,
            validations: structuredClone(field.validations),
            ...(wireField.allowed_values
                ? { allowed_values: structuredClone(wireField.allowed_values) }
                : {}),
            ...(wireField.constraints
                ? { constraints: structuredClone(wireField.constraints) }
                : {}),
        };
    });
    const inputByName = new Map(
        inputFields.map((field) => [field.name, field])
    );
    const requestFields = definitionAction.input.fields.map((field) => {
        const input = inputByName.get(field.name);
        return {
            name: field.body_field,
            source_field: field.name,
            type: structuredClone(input.type),
            required: input.required,
            nullable: input.nullable,
            ...(input.allowed_values
                ? { allowed_values: structuredClone(input.allowed_values) }
                : {}),
            ...(input.constraints
                ? { constraints: structuredClone(input.constraints) }
                : {}),
        };
    });
    const responseWireFields = responseWireModel.fields.map((field) =>
        graphMode
            ? projectActionGraphField(field)
            : primitiveField(field, 'response wire field')
    );
    const responseWireByName = new Map(
        responseWireFields.map((field) => [field.name, field])
    );
    const resultFields = definitionAction.result_model.fields.map((field) => {
        const wireField = responseWireByName.get(field.source_field);
        if (!wireField) {
            fail(
                `${definitionAction.id}.${field.name} has unresolved response field ${field.source_field}`
            );
        }
        return {
            name: field.name,
            source_field: field.source_field,
            type: structuredClone(wireField.type),
            required: wireField.required,
            nullable: wireField.nullable,
        };
    });
    return {
        id: definitionAction.id,
        description: operation.description,
        port: {
            input: {
                kind: graphMode && !requestBody ? 'none' : 'object',
                fields: inputFields,
            },
            output: {
                kind: 'result',
                model_id: definitionAction.result_model.id,
            },
        },
        access: structuredClone(operation.access),
        request_policy: requestPolicy(
            operation,
            backendContract,
            definitionAction.execution
        ),
        transport: {
            operation_id: operation.id,
            service_id: operation.service_id,
            method: operation.method,
            path: operation.path,
            request_media_type: requestBody?.media_types[0] ?? null,
            request_model_id: requestWireModel.id,
            success_response_status: response.status,
            response_media_type: response.body.media_type,
            response_model_id: responseWireModel.id,
            envelope: structuredClone(response.body.envelope),
        },
        request_model: {
            id: requestWireModel.id,
            unknown_fields: 'reject',
            fields: requestFields,
        },
        response_wire_model: {
            id: responseWireModel.id,
            unknown_fields: 'reject',
            fields: responseWireFields,
        },
        result_model: {
            id: definitionAction.result_model.id,
            description: definitionAction.result_model.description,
            fields: resultFields,
        },
        controller: controller(definitionAction.execution),
        failures: failureContract(
            operation,
            response,
            backendContract.models,
            definitionAction.execution,
            graphMode
        ),
        ...(graphMode
            ? {
                  model_graph: projectActionResultGraph(
                      backendContract.models,
                      [
                          responseWireModel.id,
                          ...backendContract.operations
                              .find(
                                  (candidate) => candidate.id === operation.id
                              )
                              .responses.filter(
                                  (candidate) =>
                                      candidate.outcome === 'error' &&
                                      candidate.body
                              )
                              .map((candidate) => candidate.body.model_id),
                      ]
                  ),
                  error_presentations: structuredClone(
                      definitionAction.error_presentations
                  ),
              }
            : {}),
    };
}

function expectedController(execution) {
    return controller(execution);
}

export function validateActionRequestV2ExecutionModel(model) {
    const errors = [];
    const graphMode = model?.schema_version === '1.1.0';
    if (
        !exactKeys(model, [
            'schema_version',
            'kind',
            'model_id',
            'domain',
            'backend_contract',
            'actions',
        ])
    ) {
        errors.push('$: execution model must use the closed root shape');
    }
    if (!['1.0.0', '1.1.0'].includes(model?.schema_version)) {
        errors.push('$.schema_version: expected 1.0.0');
    }
    if (model?.kind !== 'action-request-execution-model') {
        errors.push('$.kind: expected action-request-execution-model');
    }
    const seen = new Set();
    for (const [index, action] of (model?.actions ?? []).entries()) {
        const path = `$.actions[${index}]`;
        if (
            !exactKeys(action, [
                'id',
                'description',
                'port',
                'access',
                'request_policy',
                'transport',
                'request_model',
                'response_wire_model',
                'result_model',
                'controller',
                'failures',
                ...(graphMode ? ['model_graph', 'error_presentations'] : []),
            ])
        ) {
            errors.push(`${path}: action must use the closed shape`);
        }
        if (
            !exactKeys(action.port, ['input', 'output']) ||
            !exactKeys(action.port?.input, ['kind', 'fields']) ||
            !exactKeys(action.port?.output, ['kind', 'model_id']) ||
            !exactKeys(action.request_policy, [
                'authentication',
                'idempotency',
            ]) ||
            !exactKeys(action.transport, [
                'operation_id',
                'service_id',
                'method',
                'path',
                'request_media_type',
                'request_model_id',
                'success_response_status',
                'response_media_type',
                'response_model_id',
                'envelope',
            ]) ||
            !exactKeys(action.request_model, [
                'id',
                'unknown_fields',
                'fields',
            ]) ||
            !exactKeys(action.response_wire_model, [
                'id',
                'unknown_fields',
                'fields',
            ]) ||
            !exactKeys(action.result_model, ['id', 'description', 'fields']) ||
            !exactKeys(action.failures, [
                'invalid_input',
                'invalid_response',
                'backend_declared',
                'http_responses',
                'transport',
                'post_success',
            ])
        ) {
            errors.push(`${path}: nested contracts must use closed shapes`);
        }
        if (seen.has(action.id))
            errors.push(`${path}.id: duplicate ${action.id}`);
        seen.add(action.id);
        if (!MUTATION_METHODS.has(action.transport?.method)) {
            errors.push(`${path}.transport.method: action requires a mutation`);
        }
        if (
            (!(
                graphMode &&
                action.port?.input?.kind === 'none' &&
                action.transport?.request_media_type === null
            ) &&
                action.transport?.request_media_type !== 'application/json') ||
            action.transport?.response_media_type !== 'application/json'
        ) {
            errors.push(`${path}.transport: only application/json is proven`);
        }
        if (
            action.transport?.request_model_id !== action.request_model?.id ||
            action.transport?.response_model_id !==
                action.response_wire_model?.id
        ) {
            errors.push(`${path}.transport: wire model reference drift`);
        }
        if (
            action.port?.output?.kind !== 'result' ||
            action.port?.output?.model_id !== action.result_model?.id
        ) {
            errors.push(`${path}.port.output: does not match result model`);
        }
        const inputFields = new Map(
            (action.port?.input?.fields ?? []).map((field) => [
                field.name,
                field,
            ])
        );
        if (
            !(
                graphMode &&
                action.port?.input?.kind === 'none' &&
                inputFields.size === 0 &&
                action.request_model?.id === null &&
                action.request_model?.fields?.length === 0
            ) &&
            (action.port?.input?.kind !== 'object' || inputFields.size === 0)
        ) {
            errors.push(`${path}.port.input: requires a non-empty object`);
        }
        for (const [fieldIndex, field] of (
            action.port?.input?.fields ?? []
        ).entries()) {
            if (
                !closedKeys(
                    field,
                    ['name', 'type', 'required', 'nullable', 'validations'],
                    ['allowed_values', 'constraints']
                )
            ) {
                errors.push(
                    `${path}.port.input.fields[${fieldIndex}]: field must use the closed shape`
                );
            }
        }
        const requestNames = new Set();
        const requestSources = new Set();
        for (const [fieldIndex, field] of (
            action.request_model?.fields ?? []
        ).entries()) {
            const input = inputFields.get(field.source_field);
            if (
                !closedKeys(
                    field,
                    ['name', 'source_field', 'type', 'required', 'nullable'],
                    ['allowed_values', 'constraints']
                ) ||
                !input ||
                requestNames.has(field.name) ||
                requestSources.has(field.source_field) ||
                JSON.stringify(input.type) !== JSON.stringify(field.type) ||
                input.required !== field.required ||
                input.nullable !== field.nullable ||
                JSON.stringify(input.allowed_values) !==
                    JSON.stringify(field.allowed_values) ||
                JSON.stringify(input.constraints) !==
                    JSON.stringify(field.constraints)
            ) {
                errors.push(
                    `${path}.request_model.fields[${fieldIndex}]: invalid input mapping`
                );
            }
            requestNames.add(field.name);
            requestSources.add(field.source_field);
        }
        if (
            requestSources.size !== inputFields.size ||
            action.request_model?.unknown_fields !== 'reject'
        ) {
            errors.push(`${path}.request_model: incomplete strict encoder`);
        }
        const responseFields = new Map(
            (action.response_wire_model?.fields ?? []).map((field) => [
                field.name,
                field,
            ])
        );
        for (const [fieldIndex, field] of (
            action.response_wire_model?.fields ?? []
        ).entries()) {
            if (
                !closedKeys(
                    field,
                    ['name', 'type', 'required', 'nullable'],
                    [
                        'allowed_values',
                        'constraints',
                        ...(graphMode ? ['format'] : []),
                    ]
                )
            ) {
                errors.push(
                    `${path}.response_wire_model.fields[${fieldIndex}]: field must use the closed shape`
                );
            }
        }
        for (const [fieldIndex, field] of (
            action.result_model?.fields ?? []
        ).entries()) {
            const source = responseFields.get(field.source_field);
            if (
                !exactKeys(field, [
                    'name',
                    'source_field',
                    'type',
                    'required',
                    'nullable',
                ]) ||
                !source ||
                JSON.stringify(source.type) !== JSON.stringify(field.type) ||
                source.required !== field.required ||
                source.nullable !== field.nullable
            ) {
                errors.push(
                    `${path}.result_model.fields[${fieldIndex}]: unresolved wire source ${field.source_field}`
                );
            }
        }
        if (action.response_wire_model?.unknown_fields !== 'reject') {
            errors.push(
                `${path}.response_wire_model: decoder must reject unknown fields`
            );
        }
        if (graphMode) errors.push(...validateActionGraphBindings(action));
        const authentication = action.request_policy?.authentication;
        if (
            (authentication?.mode === 'omit' &&
                !exactKeys(authentication, ['mode'])) ||
            (authentication?.mode === 'host' &&
                !exactKeys(authentication, ['mode', 'schemes'])) ||
            !['omit', 'host'].includes(authentication?.mode)
        ) {
            errors.push(
                `${path}.request_policy.authentication: must use the closed shape`
            );
        }
        if (
            (action.access?.mode === 'public' &&
                authentication?.mode !== 'omit') ||
            (action.access?.mode !== 'public' &&
                authentication?.mode !== 'host')
        ) {
            errors.push(
                `${path}.request_policy.authentication: contradicts access`
            );
        }
        if (
            JSON.stringify(action.request_policy?.idempotency) !==
            JSON.stringify(action.controller?.execution?.idempotency)
        ) {
            errors.push(
                `${path}.request_policy.idempotency: contradicts controller`
            );
        }
        const expected = expectedController(action.controller?.execution ?? {});
        if (
            !exactKeys(action.controller, [
                'initial_state',
                'states',
                'commands',
                'state_rules',
                'commit_boundary',
                'execution',
            ]) ||
            JSON.stringify(action.controller) !== JSON.stringify(expected)
        ) {
            errors.push(
                `${path}.controller: incomplete commit-safe transition contract`
            );
        }
        const expectedPostSuccess =
            action.controller?.execution?.post_success?.mode === 'host'
                ? {
                      mode: 'host-propagated',
                      failure_state: 'committed-with-local-error',
                  }
                : { mode: 'none' };
        if (
            JSON.stringify(action.failures?.post_success) !==
            JSON.stringify(expectedPostSuccess)
        ) {
            errors.push(
                `${path}.failures.post_success: contradicts controller`
            );
        }
    }
    if ((model?.actions ?? []).length === 0) {
        errors.push('$.actions: requires at least one action');
    }
    return errors;
}

export function compileActionRequestV2ExecutionModel({
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
        if (definition.schema_version === '2.1.0') {
            if (Buffer.byteLength(backendContractDocument) > 1048576)
                fail('AR_GRAPH_LIMIT');
            backendContract = observationIO.parse(
                Buffer.from(backendContractDocument),
                {
                    depth: 32,
                    nodes: 32768,
                    stringLength: 8192,
                    width: 2048,
                }
            );
        } else
            backendContract = JSON.parse(
                backendContractDocument.toString('utf8')
            );
    } catch (error) {
        if (definition.schema_version === '2.1.0') fail('AR_GRAPH_BACKEND');
        fail(`backend contract is not valid JSON (${error.message})`);
    }
    const definitionErrors = validateActionRequestV2Definition(
        definition,
        backendContract,
        { backendContractSha256, backendContractUri }
    );
    if (definitionErrors.length > 0) {
        fail(`invalid definition\n${definitionErrors.join('\n')}`);
    }
    const model = {
        schema_version:
            definition.schema_version === '2.1.0' ? '1.1.0' : '1.0.0',
        kind: 'action-request-execution-model',
        model_id: `${definition.feature.id}-action-request-execution`,
        domain: structuredClone(definition.feature),
        backend_contract: structuredClone(definition.backend_contract),
        actions: definition.operations.map((action) =>
            compileAction(
                action,
                backendContract,
                definition.schema_version === '2.1.0'
            )
        ),
    };
    const modelErrors = validateActionRequestV2ExecutionModel(model);
    if (modelErrors.length > 0) {
        fail(`invalid compiled model\n${modelErrors.join('\n')}`);
    }
    return model;
}
