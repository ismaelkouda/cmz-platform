import { validateActionRequestV2ExecutionModel } from '../core/action-request-v2-compiler.mjs';

import { pascalCase } from './shared.mjs';

function fail(renderer, message) {
    throw new Error(`${renderer} action-request v2 renderer: ${message}`);
}

export function exactKeys(value, expected) {
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

function property(name) {
    return JSON.stringify(name);
}

function typeScriptType(field, renderer) {
    if (field.type?.kind !== 'primitive' || field.type.name !== 'string') {
        fail(
            renderer,
            `unsupported primitive ${field.type?.kind}:${field.type?.name ?? ''}; only the active required string shape is proven`
        );
    }
    if (
        field.required !== true ||
        field.nullable !== false ||
        field.allowed_values !== undefined ||
        Object.keys(field.constraints ?? {}).length > 0
    ) {
        fail(
            renderer,
            `${field.name} requires the proven required non-null string shape without backend constraints`
        );
    }
    return 'string';
}

function renderInterface(model, renderer) {
    const fields = model.fields
        .map(
            (field) =>
                `    readonly ${property(field.name)}: ${typeScriptType(field, renderer)};`
        )
        .join('\n');
    return `export interface ${pascalCase(model.id)} {\n${fields}\n}`;
}

function renderInputInterface(action, renderer) {
    const fields = action.port.input.fields
        .map(
            (field) =>
                `    readonly ${property(field.name)}: ${typeScriptType(field, renderer)};`
        )
        .join('\n');
    return `export interface ${pascalCase(action.id)}Input {\n${fields}\n}`;
}

export function renderActionRequestV2Models(action, renderer) {
    return `${renderInputInterface(action, renderer)}\n\n${renderInterface(action.request_model, renderer)}\n\n${renderInterface(action.response_wire_model, renderer)}\n\n${renderInterface(action.result_model, renderer)}\n`;
}

export function renderActionRequestV2Validation(action, invalidPayloadSource) {
    const inputName = `${pascalCase(action.id)}Input`;
    const knownFields = action.port.input.fields.map((field) => field.name);
    const fieldChecks = action.port.input.fields
        .map((field, index) => {
            const path = `$.${field.name}`;
            const variable = `value${index}`;
            const checks = [
                `    const ${variable} = record[${property(field.name)}];`,
                `    if (typeof ${variable} !== 'string' || ${variable}.trim().length === 0) invalid(${JSON.stringify(path)}, 'non-empty string');`,
            ];
            for (const validation of field.validations) {
                if (validation.kind === 'required') continue;
                if (
                    validation.kind === 'format' &&
                    validation.format === 'email'
                ) {
                    checks.push(
                        `    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(${variable})) invalid(${JSON.stringify(path)}, 'email');`
                    );
                    continue;
                }
            }
            return checks.join('\n');
        })
        .join('\n');
    const validatedFields = action.port.input.fields
        .map(
            (field, index) => `        ${property(field.name)}: value${index},`
        )
        .join('\n');
    return `${invalidPayloadSource}

import type { ${inputName} } from './models';

function invalid(path: string, expected: string): never {
    throw new InvalidPayloadError(path, expected);
}

const INPUT_FIELDS = new Set(${JSON.stringify(knownFields)});

export function validate${inputName}(input: unknown): ${inputName} {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        invalid('$', 'object');
    }
    const record = input as Readonly<Record<string, unknown>>;
    for (const key of Object.keys(record)) {
        if (!INPUT_FIELDS.has(key)) invalid('$.' + key, 'declared field');
    }
${fieldChecks}
    return {
${validatedFields}
    };
}
`;
}

export function renderActionRequestV2Decoder(action, errorSource) {
    const wireName = pascalCase(action.response_wire_model.id);
    const resultName = pascalCase(action.result_model.id);
    const decoderName = `decode${pascalCase(action.id)}Response`;
    const envelope = action.transport.envelope;
    const fieldReads = action.response_wire_model.fields
        .map(
            (
                field,
                index
            ) => `    const value${index} = record[${property(field.name)}];
    if (typeof value${index} !== 'string') invalid('$.${envelope.data_field}.${field.name}', 'string');`
        )
        .join('\n');
    const wireAssignment = action.response_wire_model.fields
        .map(
            (field, index) => `        ${property(field.name)}: value${index},`
        )
        .join('\n');
    const resultAssignment = action.result_model.fields
        .map(
            (field) =>
                `        ${property(field.name)}: wire[${property(field.source_field)}],`
        )
        .join('\n');
    return `${errorSource}

import type { ${resultName}, ${wireName} } from './models';

function invalid(path: string, expected: string): never {
    throw new InvalidPayloadError(path, expected);
}

function asRecord(value: unknown, path: string): Readonly<Record<string, unknown>> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        invalid(path, 'object');
    }
    return value as Readonly<Record<string, unknown>>;
}

const WIRE_FIELDS = new Set(${JSON.stringify(action.response_wire_model.fields.map((field) => field.name))});
const ENVELOPE_FIELDS = new Set(${JSON.stringify([
        envelope.data_field,
        envelope.error_field,
        envelope.message_field,
    ])});

function decodeWire(value: unknown): ${wireName} {
    const record = asRecord(value, '$.${envelope.data_field}');
    for (const key of Object.keys(record)) {
        if (!WIRE_FIELDS.has(key)) invalid('$.${envelope.data_field}.' + key, 'declared field');
    }
${fieldReads}
    return {
${wireAssignment}
    };
}

export function ${decoderName}(payload: unknown): ${resultName} {
    const envelope = asRecord(payload, '$');
    for (const key of Object.keys(envelope)) {
        if (!ENVELOPE_FIELDS.has(key)) invalid('$.' + key, 'declared envelope field');
    }
    const error = envelope[${property(envelope.error_field)}];
    const message = envelope[${property(envelope.message_field)}];
    if (typeof error !== 'boolean') invalid('$.${envelope.error_field}', 'boolean');
    if (typeof message !== 'string') invalid('$.${envelope.message_field}', 'string');
    if (error) throw new ServerResponseError(message);
    const wire = decodeWire(envelope[${property(envelope.data_field)}]);
    return {
${resultAssignment}
    };
}
`;
}

function validateExecution(
    action,
    renderer,
    { allowCallerDeclaredInvalidation = false } = {}
) {
    const execution = action.controller.execution;
    const supportedInvalidation = allowCallerDeclaredInvalidation
        ? new Set(['none', 'caller-declared'])
        : new Set(['none']);
    if (
        execution.concurrency !== 'reject-while-pending' ||
        execution.retry?.mode !== 'none' ||
        execution.idempotency?.mode !== 'none' ||
        !supportedInvalidation.has(execution.invalidation?.mode) ||
        execution.post_success?.mode !== 'none'
    ) {
        fail(
            renderer,
            `${action.id} has an execution policy without an oracle`
        );
    }
}

export function assertActionRequestV2RendererModel(
    model,
    renderer,
    options = {}
) {
    const errors = validateActionRequestV2ExecutionModel(model);
    if (errors.length > 0) {
        fail(renderer, `invalid execution model\n${errors.join('\n')}`);
    }
    if (model.actions.length !== 1) {
        fail(renderer, 'requires exactly one action');
    }
    const action = model.actions[0];
    if (
        action.access.mode !== 'public' ||
        action.access.security_scheme_ids.length !== 0 ||
        action.access.permissions.length !== 0 ||
        !exactKeys(action.request_policy.authentication, ['mode']) ||
        action.request_policy.authentication.mode !== 'omit'
    ) {
        fail(renderer, `${action.id} requires the proven public auth omission`);
    }
    if (
        action.transport.method !== 'POST' ||
        action.transport.success_response_status !== 200 ||
        action.transport.request_media_type !== 'application/json' ||
        action.transport.response_media_type !== 'application/json' ||
        action.transport.path.includes('{')
    ) {
        fail(renderer, `${action.id} requires the proven JSON POST shape`);
    }
    if (
        action.transport.envelope.kind !== 'object' ||
        !exactKeys(action.transport.envelope, [
            'kind',
            'data_field',
            'error_field',
            'message_field',
        ])
    ) {
        fail(renderer, `${action.id} requires the proven JSON object envelope`);
    }
    if (
        action.port.input.fields.length !== 1 ||
        action.request_model.fields.length !== 1 ||
        action.response_wire_model.fields.length !== 1 ||
        action.result_model.fields.length !== 1
    ) {
        fail(renderer, `${action.id} requires the proven single-field shape`);
    }
    const validations = action.port.input.fields[0].validations;
    if (
        JSON.stringify(validations) !==
        JSON.stringify([
            { kind: 'required' },
            { kind: 'format', format: 'email' },
        ])
    ) {
        fail(renderer, `${action.id} requires the proven email validation`);
    }
    for (const field of [
        ...action.port.input.fields,
        ...action.request_model.fields,
        ...action.response_wire_model.fields,
        ...action.result_model.fields,
    ]) {
        typeScriptType(field, renderer);
    }
    validateExecution(action, renderer, options);
    return action;
}
