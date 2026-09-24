import { validateActionRequestV2ExecutionModel } from '../core/action-request-v2-compiler.mjs';

import { pascalCase } from './shared.mjs';

function fail(message) {
    throw new Error(`angular action-request v2 renderer: ${message}`);
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

function property(name) {
    return JSON.stringify(name);
}

function typeScriptType(field) {
    if (field.type?.kind !== 'primitive' || field.type.name !== 'string') {
        fail(
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
            `${field.name} requires the proven required non-null string shape without backend constraints`
        );
    }
    return 'string';
}

function renderInterface(model) {
    const fields = model.fields
        .map(
            (field) =>
                `    readonly ${property(field.name)}: ${typeScriptType(field)};`
        )
        .join('\n');
    return `export interface ${pascalCase(model.id)} {\n${fields}\n}`;
}

function renderInputInterface(action) {
    const fields = action.port.input.fields
        .map(
            (field) =>
                `    readonly ${property(field.name)}: ${typeScriptType(field)};`
        )
        .join('\n');
    return `export interface ${pascalCase(action.id)}Input {\n${fields}\n}`;
}

function renderModels(action) {
    return `${renderInputInterface(action)}\n\n${renderInterface(action.request_model)}\n\n${renderInterface(action.response_wire_model)}\n\n${renderInterface(action.result_model)}\n`;
}

function renderValidation(action) {
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
                fail(
                    `${action.id}.${field.name} has a validation without an Angular oracle`
                );
            }
            return checks.join('\n');
        })
        .join('\n');
    const validatedFields = action.port.input.fields
        .map(
            (field, index) => `        ${property(field.name)}: value${index},`
        )
        .join('\n');
    return `import { InvalidPayloadError } from '@cmz/shared-domain';

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

function renderDecoder(action) {
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
    return `import { InvalidPayloadError, ServerResponseError } from '@cmz/shared-domain';

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

function renderSource(action, binding) {
    const className = `${pascalCase(action.id)}Source`;
    const inputName = `${pascalCase(action.id)}Input`;
    const requestName = pascalCase(action.request_model.id);
    const resultName = pascalCase(action.result_model.id);
    const decoderName = `decode${pascalCase(action.id)}Response`;
    const validatorName = `validate${inputName}`;
    const requestFields = action.request_model.fields
        .map(
            (field) =>
                `            ${property(field.name)}: validated[${property(field.source_field)}],`
        )
        .join('\n');
    const policy = JSON.stringify(
        {
            authentication: {
                mode: action.request_policy.authentication.mode,
            },
        },
        null,
        4
    );
    return `import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { createActionRequestContext, ${binding.token}, type ActionRequestRequestPolicy } from '${binding.module}';
import { InvalidPayloadError } from '@cmz/shared-domain';
import { map, type Observable } from 'rxjs';

import { ${decoderName} } from './${action.id}.decoder';
import type { ${inputName}, ${requestName}, ${resultName} } from './models';
import { ${validatorName} } from './validation';

const REQUEST_POLICY: ActionRequestRequestPolicy = ${policy};

function joinUrl(baseUrl: string, path: string): string {
    return [baseUrl.replace(/\\/$/, ''), path.replace(/^\\//, '')].join('/');
}

@Service({ autoProvided: false })
export class ${className} {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = inject(${binding.token});

    execute(input: ${inputName}): Observable<${resultName}> {
        const validated = ${validatorName}(input);
        const body: ${requestName} = {
${requestFields}
        };
        return this.http
            .request<unknown>(${JSON.stringify(action.transport.method)}, joinUrl(this.baseUrl, ${JSON.stringify(action.transport.path)}), {
                body,
                context: createActionRequestContext(REQUEST_POLICY),
                headers: {
                    Accept: ${JSON.stringify(action.transport.response_media_type)},
                    'Content-Type': ${JSON.stringify(action.transport.request_media_type)},
                },
                observe: 'response',
            })
            .pipe(
                map((response) => {
                    if (response.status !== ${action.transport.success_response_status}) {
                        throw new InvalidPayloadError('$.status', 'HTTP ${action.transport.success_response_status}');
                    }
                    return ${decoderName}(response.body);
                })
            );
    }
}
`;
}

function renderFacade(action) {
    const className = `${pascalCase(action.id)}Facade`;
    const sourceName = `${pascalCase(action.id)}Source`;
    const inputName = `${pascalCase(action.id)}Input`;
    const resultName = pascalCase(action.result_model.id);
    const states = action.controller.states
        .map((state) => property(state))
        .join(' | ');
    return `import { Service, inject, signal } from '@angular/core';
import { DomainError } from '@cmz/shared-domain';
import { catchError, defer, tap, throwError, type Observable } from 'rxjs';

import { ${sourceName} } from './${action.id}.source';
import type { ${inputName}, ${resultName} } from './models';

export type ${pascalCase(action.id)}State = ${states};

export class ActionRequestPendingError extends DomainError {
    readonly code = 'ACTION_REQUEST_PENDING';
    readonly messageKey = 'ERRORS.ACTION_REQUEST.PENDING';
    readonly statusCode = 409;

    constructor() {
        super('Action request is already pending');
    }
}

@Service({ autoProvided: false })
export class ${className} {
    private readonly source = inject(${sourceName});
    private readonly _state = signal<${pascalCase(action.id)}State>('idle');
    private readonly _result = signal<${resultName} | undefined>(undefined);
    private readonly _error = signal<unknown>(undefined);

    readonly state = this._state.asReadonly();
    readonly result = this._result.asReadonly();
    readonly error = this._error.asReadonly();

    submit(input: ${inputName}): Observable<${resultName}> {
        return defer(() => {
            if (this._state() === 'submitting') {
                throw new ActionRequestPendingError();
            }
            this._state.set('submitting');
            this._error.set(undefined);
            this._result.set(undefined);
            return this.source.execute(input);
        }).pipe(
            tap((result) => {
                this._result.set(result);
                this._state.set('success');
            }),
            catchError((error: unknown) => {
                if (!(error instanceof ActionRequestPendingError)) {
                    this._error.set(error);
                    this._state.set('error');
                }
                return throwError(() => error);
            })
        );
    }
}
`;
}

function validateExecution(action) {
    const execution = action.controller.execution;
    if (
        execution.concurrency !== 'reject-while-pending' ||
        execution.retry?.mode !== 'none' ||
        execution.idempotency?.mode !== 'none' ||
        execution.invalidation?.mode !== 'none' ||
        execution.post_success?.mode !== 'none'
    ) {
        fail(`${action.id} has an execution policy without an Angular oracle`);
    }
}

function validateInput(model, hostBindings) {
    const errors = validateActionRequestV2ExecutionModel(model);
    if (errors.length > 0) {
        fail(`invalid execution model\n${errors.join('\n')}`);
    }
    if (model.actions.length !== 1) {
        fail('requires exactly one action');
    }
    const action = model.actions[0];
    if (
        action.access.mode !== 'public' ||
        action.access.security_scheme_ids.length !== 0 ||
        action.access.permissions.length !== 0 ||
        !exactKeys(action.request_policy.authentication, ['mode']) ||
        action.request_policy.authentication.mode !== 'omit'
    ) {
        fail(`${action.id} requires the proven public host-auth omission`);
    }
    if (
        action.transport.method !== 'POST' ||
        action.transport.success_response_status !== 200 ||
        action.transport.request_media_type !== 'application/json' ||
        action.transport.response_media_type !== 'application/json' ||
        action.transport.path.includes('{')
    ) {
        fail(`${action.id} requires the proven parameterless JSON POST shape`);
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
        fail(`${action.id} requires the proven JSON object envelope`);
    }
    if (
        action.port.input.fields.length !== 1 ||
        action.request_model.fields.length !== 1 ||
        action.response_wire_model.fields.length !== 1 ||
        action.result_model.fields.length !== 1
    ) {
        fail(`${action.id} requires the proven single-field active shape`);
    }
    const validations = action.port.input.fields[0].validations;
    if (
        JSON.stringify(validations) !==
        JSON.stringify([
            { kind: 'required' },
            { kind: 'format', format: 'email' },
        ])
    ) {
        fail(`${action.id} requires the proven required email validation`);
    }
    for (const field of [
        ...action.port.input.fields,
        ...action.request_model.fields,
        ...action.response_wire_model.fields,
        ...action.result_model.fields,
    ]) {
        typeScriptType(field);
    }
    validateExecution(action);
    if (!exactKeys(hostBindings, ['services'])) {
        fail('host bindings must use the closed services shape');
    }
    if (
        !hostBindings.services ||
        typeof hostBindings.services !== 'object' ||
        Array.isArray(hostBindings.services)
    ) {
        fail('host bindings services must be an object');
    }
    const binding = hostBindings.services[action.transport.service_id];
    if (!binding || !exactKeys(binding, ['module', 'token'])) {
        fail(`missing closed host binding for ${action.transport.service_id}`);
    }
    if (!exactKeys(hostBindings.services, [action.transport.service_id])) {
        fail(`host bindings must declare only ${action.transport.service_id}`);
    }
    if (
        !/^[@A-Za-z0-9][@A-Za-z0-9._/-]*$/.test(binding.module) ||
        !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(binding.token)
    ) {
        fail(`unsafe host binding for ${action.transport.service_id}`);
    }
    return { action, binding };
}

export function renderAngularActionRequestV2(model, hostBindings) {
    const { action, binding } = validateInput(model, hostBindings);
    const files = {
        'src/models.ts': renderModels(action),
        'src/validation.ts': renderValidation(action),
        [`src/${action.id}.decoder.ts`]: renderDecoder(action),
        [`src/${action.id}.source.ts`]: renderSource(action, binding),
        [`src/${action.id}.facade.ts`]: renderFacade(action),
        'src/index.ts': `export * from './models';\nexport * from './validation';\nexport * from './${action.id}.decoder';\nexport * from './${action.id}.source';\nexport * from './${action.id}.facade';\n`,
    };
    return { files, actionId: action.id };
}
