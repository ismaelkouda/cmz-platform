import { createHash } from 'node:crypto';

import { validateJsonSchema } from '../validate-ir.mjs';
import { validateActionRequestV2ExecutionModel } from './action-request-v2-compiler.mjs';
import { validateListQueryV2ExecutionModel } from './list-query-v2-compiler.mjs';

const ACCESS_RANK = { public: 0, authenticated: 1, authorized: 2 };

function fail(message) {
    throw new Error(`page execution planner: ${message}`);
}

function sha256(content) {
    return createHash('sha256').update(content).digest('hex');
}

function asBuffer(document, label) {
    if (Buffer.isBuffer(document)) return document;
    if (typeof document === 'string') return Buffer.from(document);
    fail(`${label} document must be bytes or text`);
}

function isNormalizedRelativeUri(value) {
    return (
        typeof value === 'string' &&
        /^[A-Za-z0-9._/-]+$/.test(value) &&
        !value.startsWith('/') &&
        value
            .split('/')
            .every((segment) => segment && !['.', '..'].includes(segment))
    );
}

function parseArtifact(artifact, label, validate) {
    if (!artifact || typeof artifact !== 'object') fail(`${label} is required`);
    if (!isNormalizedRelativeUri(artifact.uri))
        fail(`${label} uri must be a normalized relative path`);
    if (!/^[a-f0-9]{64}$/.test(artifact.sha256 ?? ''))
        fail(`${label} sha256 is invalid`);
    const document = asBuffer(artifact.document, label);
    const actualSha256 = sha256(document);
    if (actualSha256 !== artifact.sha256)
        fail(`${label} sha256 does not match its document`);
    let value;
    try {
        value = JSON.parse(document.toString('utf8'));
    } catch (error) {
        fail(`${label} is not valid JSON (${error.message})`);
    }
    const errors = validate(value);
    if (errors.length > 0) fail(`${label} is invalid\n${errors.join('\n')}`);
    return { uri: artifact.uri, sha256: actualSha256, value };
}

function exactKeys(value, expected) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return false;
    const actual = Object.keys(value).sort();
    const wanted = [...expected].sort();
    return (
        actual.length === wanted.length &&
        actual.every((key, index) => key === wanted[index])
    );
}

function duplicateValues(values) {
    const seen = new Set();
    return values.filter((value) => {
        if (seen.has(value)) return true;
        seen.add(value);
        return false;
    });
}

function primitiveReference(artifact, model, operationId) {
    return {
        uri: artifact.uri,
        sha256: artifact.sha256,
        kind: model.kind,
        schema_version: model.schema_version,
        model_id: model.model_id,
        operation_id: operationId,
    };
}

function assertPageAccess(page, operation, nodeId) {
    if (ACCESS_RANK[page.access.mode] < ACCESS_RANK[operation.access.mode]) {
        fail(`${nodeId} requires stronger access than page ${page.id}`);
    }
    const permissions = new Set(page.access.permissions);
    for (const permission of operation.access.permissions) {
        if (!permissions.has(permission))
            fail(`${nodeId} requires missing page permission ${permission}`);
    }
}

function assertBackendReference(pageContract, model, nodeId) {
    const reference = pageContract.backend_contracts.find(
        (candidate) => candidate.id === model.backend_contract.id
    );
    if (!reference || reference.role !== 'target')
        fail(`${nodeId} references a backend absent from the page targets`);
    if (reference.sha256 !== model.backend_contract.sha256)
        fail(`${nodeId} backend contract hash differs from the page contract`);
}

function collectOperations(artifacts, collectionKey) {
    return artifacts.flatMap((artifact) =>
        artifact.value[collectionKey].map((operation) => ({
            artifact,
            model: artifact.value,
            operation,
            identity: `${artifact.value.backend_contract.id}:${operation.transport.operation_id}`,
        }))
    );
}

function resolveOperation(operations, reference, label) {
    const identity = `${reference.contract_id}:${reference.operation_id}`;
    const matches = operations.filter(
        (candidate) => candidate.identity === identity
    );
    if (matches.length === 0) fail(`${label} has no primitive for ${identity}`);
    if (matches.length > 1)
        fail(`${label} has ambiguous primitives for ${identity}`);
    return matches[0];
}

function queryCapabilities(query) {
    const execution = query.controller.execution;
    const capabilities = [
        `query.cache.${execution.cache.mode}${execution.cache.scope ? `.${execution.cache.scope}` : ''}@1`,
        `query.concurrency.${execution.concurrency}@1`,
        `query.retry.${execution.retry.mode}@1`,
        `query.stale-data.reload-${execution.stale_data.on_reload}.error-${execution.stale_data.on_error}@1`,
    ];
    if (execution.cancellation.on_destroy)
        capabilities.push('query.cancellation.on-destroy@1');
    if (execution.cancellation.on_superseded)
        capabilities.push('query.cancellation.on-superseded@1');
    return capabilities;
}

function actionCapabilities(action) {
    const execution = action.controller.execution;
    return [
        `action.concurrency.${execution.concurrency}@1`,
        `action.idempotency.${execution.idempotency.mode}@1`,
        `action.invalidation.${execution.invalidation.mode}@1`,
        `action.post-success.${execution.post_success.mode}@1`,
        `action.retry.${execution.retry.mode}@1`,
    ];
}

function authenticationCapabilities(operation) {
    const authentication = operation.request_policy.authentication;
    if (authentication.mode === 'omit') return ['host.authentication.omit@1'];
    return authentication.schemes.map(
        (scheme) => `host.authentication.${scheme.kind}@1`
    );
}

function compileQueryNode(load, resolved, page, pageContract) {
    const { artifact, model, operation } = resolved;
    assertBackendReference(pageContract, model, load.id);
    assertPageAccess(page, operation, load.id);
    const declared = new Map();
    for (const binding of load.parameter_bindings) {
        const key = `${binding.parameter_in}:${binding.parameter_name}`;
        if (declared.has(key)) fail(`${load.id} duplicates parameter ${key}`);
        declared.set(key, binding);
    }
    const expected = new Set(
        operation.transport.parameters.map(
            (parameter) => `${parameter.in}:${parameter.name}`
        )
    );
    for (const key of declared.keys()) {
        if (!expected.has(key))
            fail(`${load.id} binds unknown parameter ${key}`);
    }
    const inputBindings = operation.transport.parameters.map((parameter) => {
        const key = `${parameter.in}:${parameter.name}`;
        const binding = declared.get(key);
        if (parameter.required && !binding)
            fail(`${load.id} is missing required parameter ${key}`);
        return binding
            ? {
                  input_field: parameter.source_field,
                  source: {
                      kind: binding.source_kind,
                      ref: binding.source_ref,
                  },
                  target: {
                      kind: 'backend-parameter',
                      in: parameter.in,
                      name: parameter.name,
                  },
                  type: structuredClone(parameter.type),
              }
            : null;
    });
    return {
        id: load.id,
        primitive_ref: primitiveReference(artifact, model, operation.id),
        operation_ref: structuredClone(load.operation_ref),
        scope: 'page',
        trigger: 'page-enter',
        input_bindings: inputBindings.filter(Boolean),
        state: {
            initial: operation.controller.initial_state,
            values: [...operation.controller.states],
        },
        presentation: {
            loading_state_id: load.loading_state_id,
            success_state_id: load.success_state_id,
            empty_state_id: load.empty_state_id ?? null,
            error_state_id: load.error_state_id,
        },
        capabilities: [
            ...queryCapabilities(operation),
            ...authenticationCapabilities(operation),
        ].sort(),
    };
}

const CONTROL_TYPES = {
    text: new Set(['string', 'uuid']),
    'multiline-text': new Set(['string']),
    password: new Set(['string']),
    number: new Set(['decimal', 'integer']),
    date: new Set(['date', 'datetime']),
    select: new Set(['string', 'uuid']),
    toggle: new Set(['boolean']),
};

function assertControlType(control, field, nodeId) {
    const primitive = field.type?.kind === 'primitive' ? field.type.name : null;
    if (!CONTROL_TYPES[control.kind]?.has(primitive))
        fail(
            `${nodeId} control ${control.id} is incompatible with ${primitive ?? 'non-primitive'} input ${field.name}`
        );
    if (field.required && !control.required)
        fail(`${nodeId} required input ${field.name} needs a required control`);
}

function compileCommandNode(action, resolved, page, pageContract) {
    const { artifact, model, operation } = resolved;
    assertBackendReference(pageContract, model, action.id);
    assertPageAccess(page, operation, action.id);
    const controls = new Map(
        page.controls.map((control) => [control.id, control])
    );
    const declared = new Map();
    for (const binding of action.input_bindings) {
        if (binding.target_kind !== 'body-field')
            fail(
                `${action.id} only supports body-field bindings in action-request v2`
            );
        if (declared.has(binding.target_name))
            fail(`${action.id} duplicates body field ${binding.target_name}`);
        declared.set(binding.target_name, binding);
    }
    const inputBindings = operation.request_model.fields.map((requestField) => {
        const binding = declared.get(requestField.name);
        if (requestField.required && !binding)
            fail(
                `${action.id} is missing required body field ${requestField.name}`
            );
        if (!binding) return null;
        const control = controls.get(binding.control_id);
        if (!control)
            fail(
                `${action.id} references unknown control ${binding.control_id}`
            );
        const inputField = operation.port.input.fields.find(
            (field) => field.name === requestField.source_field
        );
        if (!inputField)
            fail(
                `${action.id} cannot resolve primitive input ${requestField.source_field}`
            );
        assertControlType(control, inputField, action.id);
        return {
            input_field: inputField.name,
            source: { kind: 'control', ref: control.id },
            target: { kind: 'body-field', name: requestField.name },
            type: structuredClone(inputField.type),
        };
    });
    for (const target of declared.keys()) {
        if (
            !operation.request_model.fields.some(
                (field) => field.name === target
            )
        )
            fail(`${action.id} binds unknown body field ${target}`);
    }
    if (operation.controller.execution.invalidation.mode !== 'none')
        fail(
            `${action.id} requires caller-declared invalidation targets that application-design 1.0 cannot express`
        );
    return {
        id: action.id,
        primitive_ref: primitiveReference(artifact, model, operation.id),
        operation_ref: structuredClone(action.operation_ref),
        scope: 'page',
        trigger: 'user',
        input_bindings: inputBindings.filter(Boolean),
        state: {
            initial: operation.controller.initial_state,
            values: [...operation.controller.states],
        },
        presentation: {
            available_in_state_ids: [...action.available_in_state_ids].sort(),
            success_state_id: action.success_state_id,
            error_state_id: action.error_state_id,
        },
        invalidates: [],
        capabilities: [
            ...actionCapabilities(operation),
            ...authenticationCapabilities(operation),
        ].sort(),
    };
}

function compileOutputBinding(binding, producers) {
    const identity = `${binding.operation_ref.contract_id}:${binding.operation_ref.operation_id}`;
    const matches = producers.filter(
        (producer) => producer.resolved.identity === identity
    );
    if (matches.length === 0)
        fail(`${binding.id} has no producer node for ${identity}`);
    if (matches.length > 1)
        fail(
            `${binding.id} has ambiguous producer nodes for ${identity}; application-design must name producer_node_id`
        );
    const [{ kind, node, resolved }] = matches;
    const operation = resolved.operation;
    let output;
    if (kind === 'query') {
        if (
            binding.response_status !==
            operation.transport.success_response_status
        )
            fail(
                `${binding.id} response status differs from its query primitive`
            );
        if (binding.model_id !== operation.transport.collection_model_id)
            fail(
                `${binding.id} response model differs from its query primitive`
            );
        if (binding.field_names.length > 0)
            fail(
                `${binding.id} cannot select fields directly from a list response`
            );
        output = {
            kind: 'list',
            model_id: operation.read_model.id,
            fields: operation.read_model.fields
                .map((field) => field.name)
                .sort(),
        };
    } else {
        if (
            binding.response_status !==
            operation.transport.success_response_status
        )
            fail(
                `${binding.id} response status differs from its action primitive`
            );
        if (binding.model_id !== operation.transport.response_model_id)
            fail(
                `${binding.id} response model differs from its action primitive`
            );
        const requested =
            binding.field_names.length > 0
                ? new Set(binding.field_names)
                : new Set(
                      operation.result_model.fields.map(
                          (field) => field.source_field
                      )
                  );
        const fields = operation.result_model.fields
            .filter((field) => requested.has(field.source_field))
            .map((field) => field.name)
            .sort();
        if (fields.length !== requested.size)
            fail(`${binding.id} selects an unresolved action result field`);
        output = {
            kind: 'result',
            model_id: operation.result_model.id,
            fields,
        };
    }
    return {
        id: binding.id,
        producer_node_id: node.id,
        output,
        presentation_state_ids: [...binding.visible_in_state_ids].sort(),
    };
}

function validatePageContract(value, applicationDesignSchema) {
    const errors = [];
    if (
        !exactKeys(value, [
            'schema_version',
            'kind',
            'design_ref',
            'design',
            'experience',
            'backend_contracts',
            'page',
        ])
    )
        errors.push('$: page contract keys are not closed');
    if (value?.schema_version !== '1.0.0')
        errors.push('$.schema_version: expected 1.0.0');
    if (value?.kind !== 'page-realization-contract')
        errors.push('$.kind: expected page-realization-contract');
    errors.push(
        ...validateJsonSchema(
            value?.page,
            applicationDesignSchema.$defs.page,
            applicationDesignSchema,
            '$.page'
        )
    );
    for (const [index, reference] of (value?.backend_contracts ?? []).entries())
        errors.push(
            ...validateJsonSchema(
                reference,
                applicationDesignSchema.$defs.backendContract,
                applicationDesignSchema,
                `$.backend_contracts[${index}]`
            )
        );
    for (const duplicate of duplicateValues(
        (value?.backend_contracts ?? []).map((entry) => entry?.id)
    ))
        errors.push(`$.backend_contracts: duplicate id ${duplicate}`);
    const page = value?.page;
    for (const key of [
        'states',
        'controls',
        'actions',
        'loads',
        'data_bindings',
        'regions',
    ]) {
        for (const duplicate of duplicateValues(
            (page?.[key] ?? []).map((entry) => entry?.id)
        ))
            errors.push(`$.page.${key}: duplicate id ${duplicate}`);
    }
    const states = new Map(
        (page?.states ?? []).map((entry) => [entry.id, entry.kind])
    );
    const assertState = (id, kinds, path) => {
        const kind = states.get(id);
        if (!kind) errors.push(`${path}: unresolved state ${id}`);
        else if (!kinds.includes(kind))
            errors.push(`${path}: state ${id} must be ${kinds.join(' or ')}`);
    };
    if (page?.initial_state_id)
        assertState(
            page.initial_state_id,
            [...new Set(states.values())],
            '$.page.initial_state_id'
        );
    for (const [index, load] of (page?.loads ?? []).entries()) {
        assertState(
            load.loading_state_id,
            ['loading'],
            `$.page.loads[${index}].loading_state_id`
        );
        assertState(
            load.success_state_id,
            ['ready', 'success'],
            `$.page.loads[${index}].success_state_id`
        );
        if (load.empty_state_id)
            assertState(
                load.empty_state_id,
                ['empty'],
                `$.page.loads[${index}].empty_state_id`
            );
        assertState(
            load.error_state_id,
            ['error'],
            `$.page.loads[${index}].error_state_id`
        );
    }
    for (const [index, action] of (page?.actions ?? []).entries()) {
        if (action.kind !== 'backend') continue;
        for (const stateId of action.available_in_state_ids ?? [])
            assertState(
                stateId,
                [...new Set(states.values())],
                `$.page.actions[${index}].available_in_state_ids`
            );
        assertState(
            action.success_state_id,
            ['ready', 'success'],
            `$.page.actions[${index}].success_state_id`
        );
        assertState(
            action.error_state_id,
            ['error'],
            `$.page.actions[${index}].error_state_id`
        );
    }
    for (const [index, binding] of (page?.data_bindings ?? []).entries()) {
        for (const stateId of binding.visible_in_state_ids ?? [])
            assertState(
                stateId,
                [...new Set(states.values())],
                `$.page.data_bindings[${index}].visible_in_state_ids`
            );
    }
    if (!value?.design?.id || !value?.design?.version)
        errors.push('$.design: id and version are required');
    return errors;
}

export function validatePageExecutionCapabilities(plan, availableCapabilities) {
    const duplicates = duplicateValues(availableCapabilities ?? []);
    const available = new Set(availableCapabilities ?? []);
    return [
        ...duplicates.map(
            (value) => `available capabilities: duplicate ${value}`
        ),
        ...(plan?.required_capabilities ?? [])
            .filter((requirement) => !available.has(requirement))
            .map((requirement) => `missing target capability ${requirement}`),
    ];
}

function sortedIds(entries) {
    return entries.map((entry) => entry?.id).sort();
}

function sameValues(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
}

export function validatePageExecutionPlan(plan, schema) {
    const errors = [...validateJsonSchema(plan, schema)];
    if (!plan || typeof plan !== 'object' || Array.isArray(plan)) return errors;
    const queryNodes = plan.query_nodes ?? [];
    const commandNodes = plan.command_nodes ?? [];
    const outputBindings = plan.output_bindings ?? [];
    if (!isNormalizedRelativeUri(plan?.source?.page_contract?.uri))
        errors.push(
            '$.source.page_contract.uri: must be a normalized relative path'
        );
    for (const [entries, path] of [
        [queryNodes, '$.query_nodes'],
        [commandNodes, '$.command_nodes'],
        [outputBindings, '$.output_bindings'],
    ]) {
        for (const duplicate of duplicateValues(
            entries.map((entry) => entry?.id)
        ))
            errors.push(`${path}: duplicate id ${duplicate}`);
        if (
            !sameValues(
                entries.map((entry) => entry?.id),
                sortedIds(entries)
            )
        )
            errors.push(`${path}: entries must be sorted by id`);
    }
    const allNodes = [...queryNodes, ...commandNodes];
    for (const duplicate of duplicateValues(allNodes.map((node) => node?.id)))
        errors.push(`$.nodes: duplicate id ${duplicate}`);
    const nodes = new Map(allNodes.map((node) => [node?.id, node]));
    const queryIds = new Set(queryNodes.map((node) => node?.id));
    for (const [index, node] of queryNodes.entries()) {
        const path = `$.query_nodes[${index}]`;
        if (!isNormalizedRelativeUri(node?.primitive_ref?.uri))
            errors.push(
                `${path}.primitive_ref.uri: must be a normalized relative path`
            );
        if (node?.primitive_ref?.kind !== 'list-query-execution-model')
            errors.push(
                `${path}.primitive_ref.kind: expected list-query-execution-model`
            );
        if (!node?.state?.values?.includes(node?.state?.initial))
            errors.push(`${path}.state.initial: must belong to values`);
    }
    for (const [index, node] of commandNodes.entries()) {
        const path = `$.command_nodes[${index}]`;
        if (!isNormalizedRelativeUri(node?.primitive_ref?.uri))
            errors.push(
                `${path}.primitive_ref.uri: must be a normalized relative path`
            );
        if (node?.primitive_ref?.kind !== 'action-request-execution-model')
            errors.push(
                `${path}.primitive_ref.kind: expected action-request-execution-model`
            );
        if (!node?.state?.values?.includes(node?.state?.initial))
            errors.push(`${path}.state.initial: must belong to values`);
        for (const target of node?.invalidates ?? []) {
            if (!queryIds.has(target))
                errors.push(
                    `${path}.invalidates: unresolved query node ${target}`
                );
        }
    }
    for (const [index, binding] of outputBindings.entries()) {
        const path = `$.output_bindings[${index}]`;
        const producer = nodes.get(binding?.producer_node_id);
        if (!producer) {
            errors.push(`${path}.producer_node_id: unresolved node`);
            continue;
        }
        const expectedKind = queryIds.has(producer.id) ? 'list' : 'result';
        if (binding?.output?.kind !== expectedKind)
            errors.push(`${path}.output.kind: expected ${expectedKind}`);
    }
    const expectedCapabilities = [
        'composition.independent-node-state@1',
        'composition.producer-node-binding@1',
        ...allNodes.flatMap((node) => node?.capabilities ?? []),
    ];
    const canonicalCapabilities = [...new Set(expectedCapabilities)].sort();
    if (!sameValues(plan.required_capabilities, canonicalCapabilities))
        errors.push(
            '$.required_capabilities: must equal the exact canonical union of node requirements'
        );
    return errors;
}

export function compilePageExecutionPlan({
    pageContract,
    listQueryModels = [],
    actionRequestModels = [],
    applicationDesignSchema,
    pageExecutionPlanSchema,
}) {
    if (!applicationDesignSchema || !pageExecutionPlanSchema)
        fail('application design and page execution plan schemas are required');
    const pageArtifact = parseArtifact(pageContract, 'page contract', (value) =>
        validatePageContract(value, applicationDesignSchema)
    );
    const queryArtifacts = listQueryModels.map((artifact, index) =>
        parseArtifact(artifact, `list-query model ${index}`, (value) =>
            validateListQueryV2ExecutionModel(value)
        )
    );
    const actionArtifacts = actionRequestModels.map((artifact, index) =>
        parseArtifact(artifact, `action-request model ${index}`, (value) =>
            validateActionRequestV2ExecutionModel(value)
        )
    );
    const queryOperations = collectOperations(queryArtifacts, 'queries');
    const actionOperations = collectOperations(actionArtifacts, 'actions');
    const page = pageArtifact.value.page;
    const backendActions = page.actions.filter(
        (action) => action.kind === 'backend'
    );
    if (page.loads.length === 0 || backendActions.length === 0)
        fail(
            'a composed plan requires at least one query node and one command node'
        );
    const queryPairs = page.loads.map((load) => ({
        source: load,
        resolved: resolveOperation(
            queryOperations,
            load.operation_ref,
            load.id
        ),
    }));
    const commandPairs = backendActions.map((action) => ({
        source: action,
        resolved: resolveOperation(
            actionOperations,
            action.operation_ref,
            action.id
        ),
    }));
    const nodeIds = [
        ...queryPairs.map(({ source }) => source.id),
        ...commandPairs.map(({ source }) => source.id),
    ];
    const duplicateNodeIds = duplicateValues(nodeIds);
    if (duplicateNodeIds.length > 0)
        fail(`duplicate node id ${duplicateNodeIds[0]}`);
    const queryNodes = queryPairs
        .map(({ source, resolved }) =>
            compileQueryNode(source, resolved, page, pageArtifact.value)
        )
        .sort((left, right) => left.id.localeCompare(right.id));
    const commandNodes = commandPairs
        .map(({ source, resolved }) =>
            compileCommandNode(source, resolved, page, pageArtifact.value)
        )
        .sort((left, right) => left.id.localeCompare(right.id));
    const producers = [
        ...queryPairs.map(({ source, resolved }) => ({
            kind: 'query',
            node: source,
            resolved,
        })),
        ...commandPairs.map(({ source, resolved }) => ({
            kind: 'command',
            node: source,
            resolved,
        })),
    ];
    const outputBindings = page.data_bindings
        .map((binding) => compileOutputBinding(binding, producers))
        .sort((left, right) => left.id.localeCompare(right.id));
    const requiredCapabilities = [
        'composition.independent-node-state@1',
        'composition.producer-node-binding@1',
        ...queryNodes.flatMap((node) => node.capabilities),
        ...commandNodes.flatMap((node) => node.capabilities),
    ];
    const model = {
        schema_version: '1.0.0',
        kind: 'page-execution-plan',
        plan_id: `plan_${sha256(`${pageArtifact.value.design.id}:${page.id}`).slice(0, 16)}`,
        source: {
            page_contract: {
                uri: pageArtifact.uri,
                sha256: pageArtifact.sha256,
                design_id: pageArtifact.value.design.id,
                design_version: pageArtifact.value.design.version,
                page_id: page.id,
            },
        },
        page: {
            id: page.id,
            access: structuredClone(page.access),
            state_mode: 'independent-nodes',
        },
        required_capabilities: [...new Set(requiredCapabilities)].sort(),
        query_nodes: queryNodes,
        command_nodes: commandNodes,
        output_bindings: outputBindings,
    };
    const errors = validatePageExecutionPlan(model, pageExecutionPlanSchema);
    if (errors.length > 0)
        fail(`compiled plan is invalid\n${errors.join('\n')}`);
    return model;
}
