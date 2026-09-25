import { pascalCase } from './shared.mjs';
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
        !/^[@A-Za-z0-9][@A-Za-z0-9._/-]*$/.test(binding.module) ||
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
