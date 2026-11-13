import { isDeepStrictEqual } from 'node:util';
import { readFileSync, statSync } from 'node:fs';
import { basename, dirname, relative } from 'node:path';

import { validateJsonSchema } from '../validate-ir.mjs';
import { validateBackendContract } from './backend-contract.mjs';
import { CONTRACT_GRAPH_LIMITS } from './backend-contract-reader.mjs';
import { observationInputPrimitives as io } from './runtime-observation-evidence.mjs';

// Budgets du graphe de résultat : profondeur, nœuds, chaînes et largeur
// viennent de la lecture bornée des contrats (source unique, CI #389).
export const ACTION_RESULT_GRAPH_LIMITS = Object.freeze({
    models: 32,
    fields: 32,
    depth: CONTRACT_GRAPH_LIMITS.depth,
    pointer: 256,
    runtimeNodes: CONTRACT_GRAPH_LIMITS.nodes,
    runtimeArray: CONTRACT_GRAPH_LIMITS.width,
    runtimeMap: 128,
    runtimeString: CONTRACT_GRAPH_LIMITS.stringLength,
});
export {
    CONTRACT_GRAPH_LIMITS,
    parseContractGraph,
} from './backend-contract-reader.mjs';

const PRIMITIVES = new Set([
    'boolean',
    'integer',
    'number',
    'string',
    'uuid',
    'null',
]);
const NUMERIC_CONSTRAINTS = new Set([
    'min_length',
    'max_length',
    'minimum',
    'maximum',
    'min_items',
    'max_items',
]);
const plain = (value) =>
    Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const exact = (value, required, optional = []) =>
    plain(value) &&
    required.every((key) => Object.hasOwn(value, key)) &&
    Object.keys(value).every((key) => [...required, ...optional].includes(key));
const id = (value) =>
    typeof value === 'string' &&
    value.length <= 128 &&
    /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/.test(value);
const fieldName = (value) =>
    typeof value === 'string' && value.length > 0 && value.length <= 256;

function fail(code) {
    const error = new Error(code);
    error.name = 'ActionResultGraphError';
    error.stack = code;
    throw error;
}

function schema(name) {
    const path = new URL(`../schemas/${name}.schema.json`, import.meta.url);
    if (statSync(path).size > 524288) fail('AR_GRAPH_LIMIT');
    return io.parseSchema(readFileSync(path));
}

export async function readActionRequestDefinition(path, suppliedDocument) {
    let document = suppliedDocument;
    try {
        document ??= await io.boundedFile(dirname(path), basename(path), 65536);
    } catch {
        fail('AR_GRAPH_FILE');
    }
    if (!Buffer.isBuffer(document) || document.length > 65536)
        fail('AR_GRAPH_LIMIT');
    try {
        return { document, definition: io.parse(document) };
    } catch {
        fail('AR_GRAPH_PARSE');
    }
}

export function actionGraphSnapshotReader(contract, root) {
    if (!Array.isArray(contract.sources) || contract.sources.length > 16)
        fail('AR_GRAPH_LIMIT');
    let total = 0;
    return async (absolute) => {
        const bytes = await io.boundedFile(
            root,
            relative(root, absolute),
            65536
        );
        total += bytes.length;
        if (total > 2097152) fail('AR_GRAPH_LIMIT');
        return bytes;
    };
}

export function validateActionGraphDefinition(definition, contract) {
    try {
        if (
            validateJsonSchema(
                definition,
                schema('action-request-definition-v2')
            ).length ||
            definition.schema_version !== '2.1.0'
        )
            fail('AR_GRAPH_SCHEMA');
        if (
            validateBackendContract(contract, schema('backend-contract')).length
        )
            fail('AR_GRAPH_BACKEND');
        if (
            !['planned', 'implemented', 'verified-live'].includes(
                contract.contract.status
            )
        )
            fail('AR_GRAPH_LIFECYCLE');
        return [];
    } catch (error) {
        return [
            /^AR_GRAPH_[A-Z]+$/.test(error.message)
                ? error.message
                : 'AR_GRAPH_SCHEMA',
        ];
    }
}

function constraintsFor(field) {
    const result = {};
    if (field.constraints !== undefined) {
        if (!plain(field.constraints)) fail('AR_GRAPH_SCHEMA');
        for (const [key, value] of Object.entries(field.constraints)) {
            if (!NUMERIC_CONSTRAINTS.has(key) || !Number.isFinite(value))
                fail('AR_GRAPH_UNSUPPORTED');
            if (
                (key.includes('length') || key.includes('items')) &&
                (!Number.isInteger(value) || value < 0)
            )
                fail('AR_GRAPH_SCHEMA');
            if (
                (key.includes('length') &&
                    !['string', 'uuid'].includes(field.type?.name)) ||
                (['minimum', 'maximum'].includes(key) &&
                    !['integer', 'number'].includes(field.type?.name)) ||
                (key.includes('items') && field.type?.kind !== 'array')
            )
                fail('AR_GRAPH_UNSUPPORTED');
            result[key] = value;
        }
    }
    for (const [minimum, maximum] of [
        ['min_length', 'max_length'],
        ['minimum', 'maximum'],
        ['min_items', 'max_items'],
    ])
        if (
            result[minimum] !== undefined &&
            result[maximum] !== undefined &&
            result[minimum] > result[maximum]
        )
            fail('AR_GRAPH_SCHEMA');
    return result;
}

export function projectActionGraphField(field) {
    if (
        !plain(field) ||
        !fieldName(field.name) ||
        typeof field.required !== 'boolean' ||
        typeof field.nullable !== 'boolean'
    )
        fail('AR_GRAPH_SCHEMA');
    if (field.format !== undefined && field.format !== 'email')
        fail('AR_GRAPH_UNSUPPORTED');
    if (
        field.format &&
        !(field.type?.kind === 'primitive' && field.type.name === 'string')
    )
        fail('AR_GRAPH_SCHEMA');
    const constraints = constraintsFor(field);
    if (field.allowed_values !== undefined) {
        if (JSON.stringify(field.allowed_values).length > 65536)
            fail('AR_GRAPH_LIMIT');
        if (
            !Array.isArray(field.allowed_values) ||
            field.allowed_values.length === 0 ||
            field.allowed_values.length > 128 ||
            field.type?.kind !== 'primitive' ||
            field.type.name === 'null' ||
            field.allowed_values.some(
                (value) =>
                    !['string', 'number', 'boolean'].includes(typeof value) ||
                    typeof value !==
                        (['integer', 'number'].includes(field.type.name)
                            ? 'number'
                            : field.type.name === 'uuid'
                              ? 'string'
                              : field.type.name) ||
                    (field.type.name === 'integer' &&
                        !Number.isInteger(value)) ||
                    (typeof value === 'number' && !Number.isFinite(value)) ||
                    (typeof value === 'string' && value.length > 8192)
            )
        )
            fail('AR_GRAPH_UNSUPPORTED');
    }
    return {
        name: field.name,
        type: structuredClone(field.type),
        required: field.required,
        nullable: field.nullable,
        ...(field.format ? { format: field.format } : {}),
        ...(Object.keys(constraints).length ? { constraints } : {}),
        ...(field.allowed_values
            ? { allowed_values: structuredClone(field.allowed_values) }
            : {}),
    };
}

// Extend the existing action compiler's response model, not its transport or
// schema validator. Only the reachable finite graph is copied into execution.
export function projectActionResultGraph(models, rootIds) {
    if (
        !Array.isArray(models) ||
        models.length > 32 ||
        !Array.isArray(rootIds) ||
        rootIds.length > 32
    )
        fail('AR_GRAPH_LIMIT');
    const source = new Map();
    for (const model of models) {
        if (!plain(model) || !id(model.id) || source.has(model.id))
            fail('AR_GRAPH_SCHEMA');
        source.set(model.id, model);
    }
    const result = new Map();
    const pending = new Set();
    function visitType(type, depth) {
        if (depth > 32) fail('AR_GRAPH_LIMIT');
        if (!plain(type)) fail('AR_GRAPH_SCHEMA');
        if (type.kind === 'primitive') {
            if (!exact(type, ['kind', 'name']) || !PRIMITIVES.has(type.name))
                fail('AR_GRAPH_UNSUPPORTED');
        } else if (type.kind === 'array') {
            if (!exact(type, ['kind', 'items'])) fail('AR_GRAPH_SCHEMA');
            visitType(type.items, depth + 1);
        } else if (type.kind === 'model') {
            if (!exact(type, ['kind', 'model_id']) || !id(type.model_id))
                fail('AR_GRAPH_SCHEMA');
            visitModel(type.model_id, depth);
        } else fail('AR_GRAPH_UNSUPPORTED');
    }
    function visitModel(modelId, depth) {
        if (depth > 32) fail('AR_GRAPH_LIMIT');
        if (pending.has(modelId)) fail('AR_GRAPH_CYCLE');
        if (result.has(modelId)) return;
        if (result.size + pending.size >= 32) fail('AR_GRAPH_LIMIT');
        const model = source.get(modelId);
        if (!model) fail('AR_GRAPH_REFERENCE');
        pending.add(modelId);
        let projected;
        if (model.kind === 'object') {
            if (!Array.isArray(model.fields) || model.fields.length > 32)
                fail('AR_GRAPH_LIMIT');
            const names = new Set();
            const fields = model.fields.map((field) => {
                const projected = projectActionGraphField(field);
                if (names.has(field.name)) fail('AR_GRAPH_SCHEMA');
                names.add(field.name);
                visitType(field.type, depth + 1);
                return projected;
            });
            if (model.additional_properties)
                visitType(model.additional_properties, depth + 1);
            projected = {
                id: model.id,
                kind: model.kind,
                fields,
                ...(model.additional_properties
                    ? {
                          additional_properties: structuredClone(
                              model.additional_properties
                          ),
                      }
                    : {}),
            };
        } else if (model.kind === 'array') {
            visitType(model.items, depth + 1);
            projected = {
                id: model.id,
                kind: model.kind,
                items: structuredClone(model.items),
            };
        } else if (model.kind === 'scalar') {
            visitType(model.type, depth);
            projected = {
                id: model.id,
                kind: model.kind,
                type: structuredClone(model.type),
            };
        } else fail('AR_GRAPH_UNSUPPORTED');
        pending.delete(modelId);
        result.set(modelId, projected);
    }
    for (const root of rootIds) visitModel(root, 0);
    return [...result.values()].sort((left, right) =>
        left.id.localeCompare(right.id)
    );
}

// Unlike a prototype lookup, this resolves only declarations of the graph.
// Pointer tokens follow RFC6901 exactly; no wildcard or JS expression syntax.
export function actionGraphTypeAtPointer(graph, rootId, pointer) {
    if (
        typeof pointer !== 'string' ||
        pointer.length > 256 ||
        (pointer !== '' && !pointer.startsWith('/')) ||
        /~(?:[^01]|$)/.test(pointer)
    )
        fail('AR_GRAPH_POINTER');
    const models = new Map(graph.map((model) => [model.id, model]));
    let current = {
        type: { kind: 'model', model_id: rootId },
        required: true,
        nullable: false,
    };
    let steps = 0;
    const expand = () => {
        while (current.type.kind === 'model') {
            if (++steps > 64) fail('AR_GRAPH_LIMIT');
            const model = models.get(current.type.model_id);
            if (!model) fail('AR_GRAPH_REFERENCE');
            if (model.kind === 'object') return model;
            current = {
                ...current,
                type:
                    model.kind === 'array'
                        ? { kind: 'array', items: model.items }
                        : model.type,
            };
        }
        return null;
    };
    if (pointer === '') return current;
    for (const encoded of pointer.slice(1).split('/')) {
        const token = encoded.replaceAll('~1', '/').replaceAll('~0', '~');
        const model = expand();
        if (model) {
            const field = model.fields.find(
                (candidate) => candidate.name === token
            );
            if (!field) {
                if (!model.additional_properties) fail('AR_GRAPH_POINTER');
                current = {
                    type: model.additional_properties,
                    required: false,
                    nullable: false,
                };
            } else
                current = {
                    ...field,
                    required:
                        current.required && !current.nullable && field.required,
                };
        } else if (
            current.type.kind === 'array' &&
            /^(0|[1-9][0-9]*)$/.test(token)
        ) {
            current = {
                type: current.type.items,
                required: false,
                nullable: false,
            };
        } else fail('AR_GRAPH_POINTER');
    }
    return structuredClone(current);
}

export function validateProjectedActionGraph(graph) {
    try {
        const projection = projectActionResultGraph(
            graph,
            graph.map((model) => model.id)
        );
        if (!isDeepStrictEqual(projection, graph)) fail('AR_GRAPH_SCHEMA');
        return [];
    } catch (error) {
        return [
            /^AR_GRAPH_[A-Z]+$/.test(error.message)
                ? error.message
                : 'AR_GRAPH_SCHEMA',
        ];
    }
}

export function resolveActionRequestGraphMutation(contract, operation, action) {
    const body = operation.request.body;
    if (
        !['POST', 'PUT', 'PATCH', 'DELETE'].includes(operation.method) ||
        operation.request.parameters.length ||
        !['planned', 'implemented', 'verified-live'].includes(operation.status)
    )
        fail('AR_GRAPH_UNSUPPORTED');
    if (Boolean(body) !== (action.request_body === 'json'))
        fail('AR_GRAPH_BINDING');
    if (
        body &&
        (body.required !== true ||
            !isDeepStrictEqual(body.media_types, ['application/json']))
    )
        fail('AR_GRAPH_UNSUPPORTED');
    const inputModel = body
        ? contract.models.find((model) => model.id === body.model_id)
        : { id: null, kind: 'object', fields: [] };
    if (
        inputModel?.kind !== 'object' ||
        inputModel.fields.length > 32 ||
        inputModel.fields.some(
            (field) =>
                field.type.kind !== 'primitive' ||
                field.type.name !== 'string' ||
                !field.required ||
                field.nullable ||
                field.allowed_values ||
                field.constraints?.pattern
        )
    )
        fail('AR_GRAPH_UNSUPPORTED');
    if (
        action.input.fields.some((field) =>
            field.validations.some(
                (rule) =>
                    rule.kind !== 'required' &&
                    !(rule.kind === 'format' && rule.format === 'email')
            )
        )
    )
        fail('AR_GRAPH_UNSUPPORTED');
    for (const field of action.input.fields) {
        const wire = inputModel.fields.find(
            (entry) => entry.name === field.body_field
        );
        if (
            wire?.format === 'email' &&
            !field.validations.some(
                (rule) => rule.kind === 'format' && rule.format === 'email'
            )
        )
            fail('AR_GRAPH_BINDING');
    }
    const execution = action.execution;
    if (
        execution.concurrency !== 'reject-while-pending' ||
        execution.retry.mode !== 'none' ||
        execution.idempotency.mode !== 'none' ||
        execution.post_success.mode !== 'none' ||
        !['none', 'caller-declared'].includes(execution.invalidation.mode)
    )
        fail('AR_GRAPH_UNSUPPORTED');
    const access = operation.access;
    if (
        !['public', 'authenticated'].includes(access.mode) ||
        access.permissions.length ||
        (access.mode === 'authenticated' &&
            (access.security_scheme_ids.length !== 1 ||
                contract.security_schemes.find(
                    (scheme) => scheme.id === access.security_scheme_ids[0]
                )?.kind !== 'bearer'))
    )
        fail('AR_GRAPH_ACCESS');
    const response = operation.responses.find(
        (candidate) =>
            candidate.status === action.success_response_status &&
            candidate.outcome === 'success'
    );
    if (!response?.body || response.body.media_type !== 'application/json')
        fail('AR_GRAPH_BINDING');
    const resultModel = contract.models.find(
        (model) => model.id === response.body.model_id
    );
    if (resultModel?.kind !== 'object' || resultModel.additional_properties)
        fail('AR_GRAPH_UNSUPPORTED');
    const roots = [resultModel.id];
    for (const error of operation.responses.filter(
        (candidate) => candidate.outcome === 'error'
    )) {
        if (error.body) {
            if (error.body.media_type !== 'application/json')
                fail('AR_GRAPH_UNSUPPORTED');
            roots.push(error.body.model_id);
        }
    }
    const graph = projectActionResultGraph(contract.models, roots);
    validateActionErrorPresentations(
        operation.responses,
        graph,
        action.error_presentations
    );
    return { body, inputModel, response, resultModel, graph };
}

export function validateActionErrorPresentations(
    responses,
    graph,
    presentations
) {
    if (!Array.isArray(presentations) || presentations.length > 4)
        fail('AR_GRAPH_SCHEMA');
    const statuses = new Set();
    const models = new Map(graph.map((model) => [model.id, model]));
    for (const presentation of presentations) {
        if (
            !exact(
                presentation,
                ['status', 'message_pointer'],
                ['fields_pointer', 'status_pointer', 'error_flag_pointer']
            ) ||
            !Number.isInteger(presentation.status) ||
            presentation.status < 400 ||
            presentation.status > 599 ||
            statuses.has(presentation.status)
        )
            fail('AR_GRAPH_SCHEMA');
        statuses.add(presentation.status);
        const response = responses.find(
            (candidate) => candidate.status === presentation.status
        );
        const modelId = response?.body?.model_id ?? response?.body_model_id;
        if (!response || response.outcome === 'success' || !modelId)
            fail('AR_GRAPH_BINDING');
        for (const [key, pointer] of Object.entries(presentation)) {
            if (key === 'status') continue;
            const field = actionGraphTypeAtPointer(graph, modelId, pointer);
            if (key === 'fields_pointer') {
                const map =
                    field.type.kind === 'model'
                        ? models.get(field.type.model_id)
                        : null;
                if (
                    map?.kind !== 'object' ||
                    map.fields.length ||
                    map.additional_properties?.kind !== 'array' ||
                    map.additional_properties.items?.kind !== 'primitive' ||
                    map.additional_properties.items.name !== 'string'
                )
                    fail('AR_GRAPH_BINDING');
            } else {
                const allowed =
                    key === 'message_pointer'
                        ? ['string']
                        : key === 'status_pointer'
                          ? ['integer', 'number']
                          : ['boolean'];
                if (
                    field.type.kind !== 'primitive' ||
                    !allowed.includes(field.type.name)
                )
                    fail('AR_GRAPH_BINDING');
            }
        }
    }
}

function graphEnvelope(envelope, model) {
    if (envelope?.kind === 'none' && exact(envelope, ['kind'])) return;
    const object = envelope?.kind === 'object';
    if (
        !exact(
            envelope,
            object
                ? ['kind', 'data_field', 'error_field', 'message_field']
                : ['kind', 'error_field', 'message_field']
        ) ||
        !['object', 'status-object'].includes(envelope.kind)
    )
        fail('AR_GRAPH_SCHEMA');
    const names = Object.entries(envelope)
        .filter(([key]) => key !== 'kind')
        .map(([, value]) => value);
    if (
        names.some((name) => !fieldName(name)) ||
        new Set(names).size !== names.length
    )
        fail('AR_GRAPH_SCHEMA');
    if (!object) {
        for (const [key, primitive] of [
            ['error_field', 'boolean'],
            ['message_field', 'string'],
        ]) {
            const field = model?.fields?.find(
                (candidate) => candidate.name === envelope[key]
            );
            if (
                !field?.required ||
                field.nullable ||
                field.type.kind !== 'primitive' ||
                field.type.name !== primitive
            )
                fail('AR_GRAPH_BINDING');
        }
    }
}

export function validateActionGraphBindings(action) {
    try {
        if (
            !id(action.id) ||
            !Array.isArray(action.model_graph) ||
            !Array.isArray(action.error_presentations)
        )
            fail('AR_GRAPH_SCHEMA');
        const access = action.access;
        const authentication = action.request_policy.authentication;
        if (
            !['public', 'authenticated'].includes(access.mode) ||
            access.permissions.length ||
            (access.mode === 'public' &&
                (access.security_scheme_ids.length ||
                    authentication.mode !== 'omit')) ||
            (access.mode === 'authenticated' &&
                (access.security_scheme_ids.length !== 1 ||
                    authentication.mode !== 'host' ||
                    authentication.schemes.length !== 1 ||
                    authentication.schemes[0].kind !== 'bearer' ||
                    authentication.schemes[0].id !==
                        access.security_scheme_ids[0]))
        )
            fail('AR_GRAPH_ACCESS');
        const failures = action.failures.http_responses;
        if (
            !Array.isArray(failures) ||
            failures.length > 4 ||
            action.failures.transport !== 'typed-bounded'
        )
            fail('AR_GRAPH_SCHEMA');
        const graph = projectActionResultGraph(action.model_graph, [
            action.transport.response_model_id,
            ...failures
                .map((entry) => entry.body_model_id)
                .filter((value) => value !== null),
        ]);
        if (!isDeepStrictEqual(graph, action.model_graph))
            fail('AR_GRAPH_SCHEMA');
        const models = new Map(graph.map((model) => [model.id, model]));
        const wire = models.get(action.transport.response_model_id);
        if (
            wire?.kind !== 'object' ||
            wire.additional_properties ||
            !isDeepStrictEqual(wire.fields, action.response_wire_model.fields)
        )
            fail('AR_GRAPH_BINDING');
        graphEnvelope(action.transport.envelope, wire);
        const statuses = new Set();
        for (const response of failures) {
            if (
                !exact(response, [
                    'status',
                    'body_model_id',
                    'body_model_kind',
                    'envelope',
                ]) ||
                !Number.isInteger(response.status) ||
                response.status < 400 ||
                response.status > 599 ||
                statuses.has(response.status)
            )
                fail('AR_GRAPH_SCHEMA');
            statuses.add(response.status);
            const model = models.get(response.body_model_id);
            if (response.body_model_id === null) {
                if (
                    response.body_model_kind !== null ||
                    response.envelope !== null
                )
                    fail('AR_GRAPH_SCHEMA');
            } else {
                if (!model || model.kind !== response.body_model_kind)
                    fail('AR_GRAPH_BINDING');
                graphEnvelope(response.envelope, model);
            }
        }
        validateActionErrorPresentations(
            failures,
            graph,
            action.error_presentations
        );
        const fields = action.result_model.fields;
        if (
            !id(action.result_model.id) ||
            models.has(action.result_model.id) ||
            fields.length < 1 ||
            fields.length > 32 ||
            new Set(fields.map((field) => field.name)).size !== fields.length ||
            new Set(fields.map((field) => field.source_field)).size !==
                fields.length
        )
            fail('AR_GRAPH_SCHEMA');
        for (const field of action.port.input.fields) {
            if (
                field.type?.kind !== 'primitive' ||
                field.type.name !== 'string' ||
                field.required !== true ||
                field.nullable !== false
            )
                fail('AR_GRAPH_UNSUPPORTED');
            projectActionGraphField(field);
            if (
                !Array.isArray(field.validations) ||
                new Set(field.validations.map((rule) => rule.kind)).size !==
                    field.validations.length ||
                !field.validations.some(
                    (rule) => exact(rule, ['kind']) && rule.kind === 'required'
                ) ||
                field.validations.some(
                    (rule) =>
                        !(exact(rule, ['kind']) && rule.kind === 'required') &&
                        !(
                            exact(rule, ['kind', 'format']) &&
                            rule.kind === 'format' &&
                            rule.format === 'email'
                        )
                )
            )
                fail('AR_GRAPH_UNSUPPORTED');
        }
        return [];
    } catch (error) {
        return [
            /^AR_GRAPH_[A-Z]+$/.test(error.message)
                ? error.message
                : 'AR_GRAPH_SCHEMA',
        ];
    }
}
