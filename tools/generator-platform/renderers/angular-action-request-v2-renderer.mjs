import { pascalCase } from './shared.mjs';
import {
    actionGraphRequestTypeName,
    renderActionGraphModels,
    renderActionGraphDecoder,
} from './action-request-typed-result-renderer.mjs';
import {
    assertActionRequestV2RendererModel,
    exactKeys,
    renderActionRequestV2Decoder,
    renderActionRequestV2Models,
    renderActionRequestV2Validation,
} from './action-request-v2-renderer-shared.mjs';

function fail(message) {
    throw new Error(`angular action-request v2 renderer: ${message}`);
}

function property(name) {
    return JSON.stringify(name);
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

function validateInput(model, hostBindings, options) {
    const action = assertActionRequestV2RendererModel(
        model,
        'Angular',
        options
    );
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
        !(
            model.schema_version === '1.1.0'
                ? /^(?:[@A-Za-z0-9][@A-Za-z0-9._/-]*|(?:\.\/|(?:\.\.\/){1,8})[A-Za-z0-9][A-Za-z0-9._/-]*)$/
                : /^[@A-Za-z0-9][@A-Za-z0-9._/-]*$/
        ).test(binding.module) ||
        !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(binding.token)
    ) {
        fail(`unsafe host binding for ${action.transport.service_id}`);
    }
    return { action, binding };
}
export function renderAngularActionRequestV2(
    model,
    hostBindings,
    options = {}
) {
    const { action, binding } = validateInput(model, hostBindings, options);
    if (model.schema_version === '1.1.0')
        return renderGraphAction(action, binding);
    const files = {
        'src/models.ts': renderActionRequestV2Models(action, 'Angular'),
        'src/validation.ts': renderActionRequestV2Validation(
            action,
            "import { InvalidPayloadError } from '@cmz/shared-domain';"
        ),
        [`src/${action.id}.decoder.ts`]: renderActionRequestV2Decoder(
            action,
            "import { InvalidPayloadError, ServerResponseError } from '@cmz/shared-domain';"
        ),
        [`src/${action.id}.source.ts`]: renderSource(action, binding),
        [`src/${action.id}.facade.ts`]: renderFacade(action),
        'src/index.ts': `export * from './models';\nexport * from './validation';\nexport * from './${action.id}.decoder';\nexport * from './${action.id}.source';\nexport * from './${action.id}.facade';\n`,
    };
    return { files, actionId: action.id };
}

function graphSource(action, binding) {
    const base = pascalCase(action.id);
    const inputName = `${base}Input`;
    const resultName = pascalCase(action.result_model.id.replaceAll('.', '-'));
    const requestName = actionGraphRequestTypeName(action);
    const body =
        requestName === null
            ? ''
            : `
            const body: ${requestName} = {
${action.request_model.fields.map((field) => `                [${property(field.name)}]: validated[${property(field.source_field)}],`).join('\n')}
            };`;
    const requestType = requestName === null ? '' : `, ${requestName}`;
    return `import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { createActionRequestContext, ${binding.token}, type ActionRequestRequestPolicy } from '${binding.module}';
import { catchError, defer, map, throwError, type Observable } from 'rxjs';
import type { ${inputName}, ${resultName}${requestType} } from './models';
import { ActionRequestFailure, diagnostic, decode${base}Response, decode${base}Failure } from './${action.id}.decoder';
import { validate${inputName} } from './validation';

const REQUEST_POLICY: ActionRequestRequestPolicy = ${JSON.stringify({ authentication: { mode: action.request_policy.authentication.mode } })};
@Service({ autoProvided: false })
export class ${base}Source {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = inject(${binding.token});
    execute(input: ${inputName}${action.port.input.kind === 'none' ? ' = {}' : ''}): Observable<${resultName}> {
        return defer(() => {
            let validated: ${inputName};
            try { validated = validate${inputName}(input); }
            catch { return throwError(() => new ActionRequestFailure(diagnostic('invalid-input', 0))); }
${action.request_model.id === null ? '            void validated;' : ''}${body}
            const url = [this.baseUrl.replace(/\\/$/, ''), ${JSON.stringify(action.transport.path)}.replace(/^\\//, '')].join('/');
            return this.http.request<unknown>(${JSON.stringify(action.transport.method)}, url, {
${action.request_model.id === null ? '' : '                body,\n'}                context: createActionRequestContext(REQUEST_POLICY),
                headers: { Accept: 'application/json'${action.request_model.id === null ? '' : ", 'Content-Type': 'application/json'"} },
                observe: 'response',
            }).pipe(map((response) => {
                if (response.status !== ${action.transport.success_response_status}) throw new ActionRequestFailure(diagnostic('invalid-response', response.status));
                return decode${base}Response(response.body);
            }));
        }).pipe(catchError((error: unknown) => {
            const failure = error instanceof ActionRequestFailure ? error : new ActionRequestFailure(
                error instanceof HttpErrorResponse ? decode${base}Failure(error.status, error.error) : diagnostic('invalid-response', 0)
            );
            return throwError(() => failure);
        }));
    }
}
`;
}

function graphFacade(action) {
    const base = pascalCase(action.id);
    const result = pascalCase(action.result_model.id.replaceAll('.', '-'));
    return `import { Service, inject, signal } from '@angular/core';
import { catchError, defer, tap, throwError, type Observable } from 'rxjs';
import { ${base}Source } from './${action.id}.source';
import { ActionRequestFailure, diagnostic } from './${action.id}.decoder';
import type { ${base}Input, ${result}, ActionRequestDiagnostic } from './models';

export type ${base}State = ${action.controller.states.map((state) => JSON.stringify(state)).join(' | ')};
export class ActionRequestPendingError extends Error {
    readonly code = 'ACTION_REQUEST_PENDING';
    readonly statusCode = 409;
    constructor() { super('Une requête est déjà en cours.'); this.name = 'ActionRequestPendingError'; }
}
@Service({ autoProvided: false })
export class ${base}Facade {
    private readonly source = inject(${base}Source);
    private generation = 0;
    private readonly _state = signal<${base}State>('idle');
    private readonly _result = signal<${result} | undefined>(undefined);
    private readonly _error = signal<ActionRequestDiagnostic | undefined>(undefined);
    readonly state = this._state.asReadonly();
    readonly result = this._result.asReadonly();
    readonly error = this._error.asReadonly();
    reset(): void {
        this.generation++;
        this._result.set(undefined); this._error.set(undefined); this._state.set('idle');
    }
    submit(input: ${base}Input${action.port.input.kind === 'none' ? ' = {}' : ''}): Observable<${result}> {
        return defer(() => {
            if (this._state() === 'submitting') throw new ActionRequestPendingError();
            const generation = this.generation;
            this._state.set('submitting');
            this._result.set(undefined);
            this._error.set(undefined);
            return this.source.execute(input).pipe(
            tap((result) => {
                if (generation !== this.generation) throw new ActionRequestFailure(diagnostic('invalid-response', 0));
                this._result.set(result); this._state.set('success');
            }),
            catchError((error: unknown) => {
                if (generation !== this.generation) return throwError(() => new ActionRequestFailure(diagnostic('invalid-response', 0)));
                const failure = error instanceof ActionRequestFailure ? error : new ActionRequestFailure(diagnostic('invalid-response', 0));
                this._error.set(failure.diagnostic);
                this._state.set('error');
                return throwError(() => failure);
            })
            );
        });
    }
}
`;
}

function renderGraphAction(action, binding) {
    const files = {
        ...renderActionGraphModels(action),
        'src/validation.ts': renderActionRequestV2Validation(
            action,
            `class InvalidPayloadError extends Error {
    readonly code = 'INVALID_PAYLOAD';
    constructor(path: string, expected: string) {
        super('La requête ne peut pas être traitée.');
        this.name = 'InvalidPayloadError';
        void path; void expected;
    }
}`,
            { enforceBackendConstraints: true }
        ),
        ...renderActionGraphDecoder(action),
        [`src/${action.id}.source.ts`]: graphSource(action, binding),
        [`src/${action.id}.facade.ts`]: graphFacade(action),
        'src/index.ts': `export * from './models';\nexport * from './validation';\nexport * from './${action.id}.decoder';\nexport * from './${action.id}.source';\nexport * from './${action.id}.facade';\n`,
    };
    return { files, actionId: action.id };
}
