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
    if (
        field.type?.kind !== 'primitive' ||
        !['boolean', 'string'].includes(field.type.name)
    ) {
        fail(
            renderer,
            `unsupported primitive ${field.type?.kind}:${field.type?.name ?? ''}; only the active required string and boolean shapes are proven`
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
            `${field.name} requires a proven required non-null primitive shape without backend constraints`
        );
    }
    return field.type.name;
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

function renderWireFieldCheck(field, index, path) {
    const variable = `value${index}`;
    const expected = field.type.name;
    return `    const ${variable} = record[${property(field.name)}];
    if (typeof ${variable} !== ${JSON.stringify(expected)}) invalid(${JSON.stringify(path)}, ${JSON.stringify(expected)});`;
}

export function renderActionRequestV2Decoder(action, errorSource) {
    const wireName = pascalCase(action.response_wire_model.id);
    const resultName = pascalCase(action.result_model.id);
    const decoderName = `decode${pascalCase(action.id)}Response`;
    const envelope = action.transport.envelope;
    const wirePath =
        envelope.kind === 'object' ? `$.${envelope.data_field}` : '$';
    const fieldReads = action.response_wire_model.fields
        .map((field, index) =>
            renderWireFieldCheck(field, index, `${wirePath}.${field.name}`)
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
const ENVELOPE_FIELDS = new Set(${JSON.stringify(
        envelope.kind === 'object'
            ? [
                  envelope.data_field,
                  envelope.error_field,
                  envelope.message_field,
              ]
            : action.response_wire_model.fields.map((field) => field.name)
    )});

function decodeWire(value: unknown): ${wireName} {
    const record = asRecord(value, ${JSON.stringify(wirePath)});
    for (const key of Object.keys(record)) {
        if (!WIRE_FIELDS.has(key)) invalid(${JSON.stringify(`${wirePath}.`)} + key, 'declared field');
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
    const wire = decodeWire(${envelope.kind === 'object' ? `envelope[${property(envelope.data_field)}]` : 'envelope'});
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

function validateAuthentication(action, renderer, allowAuthenticated) {
    const authentication = action.request_policy.authentication;
    if (action.access.mode === 'public') {
        if (
            action.access.security_scheme_ids.length !== 0 ||
            action.access.permissions.length !== 0 ||
            !exactKeys(authentication, ['mode']) ||
            authentication.mode !== 'omit'
        ) {
            fail(
                renderer,
                `${action.id} requires the proven public auth omission`
            );
        }
        return;
    }
    if (!allowAuthenticated) {
        fail(renderer, `${action.id} requires the proven public auth omission`);
    }
    if (
        action.access.mode !== 'authenticated' ||
        action.access.permissions.length !== 0 ||
        !exactKeys(authentication, ['mode', 'schemes']) ||
        authentication.mode !== 'host' ||
        !Array.isArray(authentication.schemes) ||
        authentication.schemes.length === 0 ||
        authentication.schemes.some(
            (scheme) =>
                !exactKeys(scheme, ['id', 'kind']) || scheme.kind !== 'bearer'
        )
    ) {
        fail(
            renderer,
            `${action.id} requires the proven authenticated bearer host policy`
        );
    }
}

function validateInputShape(action, renderer, allowRequiredStringFields) {
    if (!allowRequiredStringFields) {
        if (
            action.port.input.fields.length !== 1 ||
            action.request_model.fields.length !== 1 ||
            action.response_wire_model.fields.length !== 1 ||
            action.result_model.fields.length !== 1
        ) {
            fail(
                renderer,
                `${action.id} requires the proven single-field shape`
            );
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
        return;
    }
    if (
        action.port.input.fields.length === 0 ||
        action.request_model.fields.length !==
            action.port.input.fields.length ||
        action.result_model.fields.length === 0
    ) {
        fail(
            renderer,
            `${action.id} requires the proven required-string action shape`
        );
    }
    for (const field of action.port.input.fields) {
        const validations = field.validations;
        const allowed =
            JSON.stringify(validations) ===
                JSON.stringify([{ kind: 'required' }]) ||
            JSON.stringify(validations) ===
                JSON.stringify([
                    { kind: 'required' },
                    { kind: 'format', format: 'email' },
                ]);
        if (field.type?.name !== 'string' || !allowed) {
            fail(
                renderer,
                `${action.id}.${field.name} lacks a proven required-string validation`
            );
        }
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
    validateAuthentication(
        action,
        renderer,
        options.allowAuthenticated === true
    );
    if (
        action.transport.method !== 'POST' ||
        action.transport.success_response_status !== 200 ||
        action.transport.request_media_type !== 'application/json' ||
        action.transport.response_media_type !== 'application/json' ||
        action.transport.path.includes('{')
    ) {
        fail(renderer, `${action.id} requires the proven JSON POST shape`);
    }
    const envelope = action.transport.envelope;
    const objectEnvelope =
        envelope.kind === 'object' &&
        exactKeys(envelope, [
            'kind',
            'data_field',
            'error_field',
            'message_field',
        ]);
    const statusErrorField = action.response_wire_model.fields.find(
        (field) => field.name === envelope.error_field
    );
    const statusMessageField = action.response_wire_model.fields.find(
        (field) => field.name === envelope.message_field
    );
    const statusEnvelope =
        options.allowStatusEnvelope === true &&
        envelope.kind === 'status-object' &&
        exactKeys(envelope, ['kind', 'error_field', 'message_field']) &&
        envelope.error_field !== envelope.message_field &&
        statusErrorField?.type?.kind === 'primitive' &&
        statusErrorField.type.name === 'boolean' &&
        statusMessageField?.type?.kind === 'primitive' &&
        statusMessageField.type.name === 'string';
    if (!objectEnvelope && !statusEnvelope) {
        fail(renderer, `${action.id} requires a proven JSON response envelope`);
    }
    validateInputShape(
        action,
        renderer,
        options.allowRequiredStringFields === true
    );
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
