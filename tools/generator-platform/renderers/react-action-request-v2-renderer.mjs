import { pascalCase } from './shared.mjs';
import {
    assertActionRequestV2RendererModel,
    renderActionRequestV2Decoder,
    renderActionRequestV2Models,
    renderActionRequestV2Validation,
} from './action-request-v2-renderer-shared.mjs';

function property(name) {
    return JSON.stringify(name);
}

function renderValidation(action) {
    return renderActionRequestV2Validation(
        action,
        `export class InvalidPayloadError extends Error {
    readonly code = 'INVALID_PAYLOAD';

    constructor(
        readonly path: string,
        readonly expected: string
    ) {
        super(\`Invalid payload at \${path}: expected \${expected}\`);
        this.name = 'InvalidPayloadError';
    }
}`
    );
}

function renderDecoder(action) {
    return renderActionRequestV2Decoder(
        action,
        `import { InvalidPayloadError } from './validation';

export class ServerResponseError extends Error {
    readonly code = 'SERVER_RESPONSE_ERROR';

    constructor(readonly serverMessage: string) {
        super(serverMessage || 'ERRORS.HTTP.SERVER_ERROR');
        this.name = 'ServerResponseError';
    }
}`
    );
}

function renderClient(action) {
    const className = `${pascalCase(action.id)}Client`;
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
    return `import { ${decoderName} } from './${action.id}.decoder';
import type { ${inputName}, ${requestName}, ${resultName} } from './models';
import { InvalidPayloadError, ${validatorName} } from './validation';

export interface ActionRequestPolicy {
    readonly authentication: { readonly mode: 'omit' };
}

export interface ActionRequestFetchResponse {
    readonly ok: boolean;
    readonly status: number;
    json(): Promise<unknown>;
}

export interface ActionRequestFetchRequest {
    readonly serviceId: string;
    readonly url: string;
    readonly method: 'POST';
    readonly headers: Readonly<Record<string, string>>;
    readonly policy: ActionRequestPolicy;
    readonly body: ${requestName};
}

export type ActionRequestFetchPort = (
    request: ActionRequestFetchRequest
) => Promise<ActionRequestFetchResponse>;

export class ActionRequestHttpError extends Error {
    constructor(readonly status: number) {
        super(\`HTTP \${status}\`);
        this.name = 'ActionRequestHttpError';
    }
}

const REQUEST_POLICY: ActionRequestPolicy = ${policy};

function joinUrl(baseUrl: string, path: string): string {
    const normalizedBaseUrl = baseUrl.endsWith('/')
        ? baseUrl.slice(0, -1)
        : baseUrl;
    const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
    return [normalizedBaseUrl, normalizedPath].join('/');
}

export class ${className} {
    constructor(
        private readonly baseUrl: string,
        private readonly fetch: ActionRequestFetchPort
    ) {}

    async execute(input: ${inputName}): Promise<${resultName}> {
        const validated = ${validatorName}(input);
        const body: ${requestName} = {
${requestFields}
        };
        const response = await this.fetch({
            serviceId: ${JSON.stringify(action.transport.service_id)},
            url: joinUrl(this.baseUrl, ${JSON.stringify(action.transport.path)}),
            method: ${JSON.stringify(action.transport.method)},
            headers: {
                Accept: ${JSON.stringify(action.transport.response_media_type)},
                'Content-Type': ${JSON.stringify(action.transport.request_media_type)},
            },
            policy: REQUEST_POLICY,
            body,
        });
        if (!response.ok) throw new ActionRequestHttpError(response.status);
        if (response.status !== ${action.transport.success_response_status}) {
            throw new InvalidPayloadError('$.status', 'HTTP ${action.transport.success_response_status}');
        }
        return ${decoderName}(await response.json());
    }
}
`;
}

function renderHooks(action) {
    const hookName = `use${pascalCase(action.id)}`;
    const factoryName = `create${pascalCase(action.id)}Hooks`;
    const className = `${pascalCase(action.id)}Client`;
    const inputName = `${pascalCase(action.id)}Input`;
    const resultName = pascalCase(action.result_model.id);
    const stateName = `${pascalCase(action.id)}State`;
    const bindingName = `${pascalCase(action.id)}Binding`;
    const states = action.controller.states
        .map((state) => property(state))
        .join(' | ');
    return `import type { ${className} } from './${action.id}.client';
import type { ${inputName}, ${resultName} } from './models';

export type StateSetter<T> = (
    value: T | ((previous: T) => T)
) => void;

export interface ReactHooksPort {
    useState<T>(initial: T): readonly [T, StateSetter<T>];
    useRef<T>(initial: T): { current: T };
    useEffect(
        effect: () => void | (() => void),
        dependencies: readonly unknown[]
    ): void;
    useCallback<TArguments extends unknown[], TResult>(
        callback: (...arguments_: TArguments) => TResult,
        dependencies: readonly unknown[]
    ): (...arguments_: TArguments) => TResult;
}

export type ${stateName} = ${states};

interface ActionSnapshot {
    readonly state: ${stateName};
    readonly result?: ${resultName};
    readonly error?: unknown;
}

export interface ${bindingName} {
    readonly state: ${stateName};
    readonly result: ${resultName} | undefined;
    readonly error: unknown;
    readonly submit: (input: ${inputName}) => Promise<${resultName}>;
}

export class ActionRequestPendingError extends Error {
    readonly code = 'ACTION_REQUEST_PENDING';

    constructor() {
        super('Action request is already pending');
        this.name = 'ActionRequestPendingError';
    }
}

export function ${factoryName}(
    hooks: ReactHooksPort,
    client: ${className}
) {
    function ${hookName}(): ${bindingName} {
        const [snapshot, setSnapshot] = hooks.useState<ActionSnapshot>({
            state: 'idle',
        });
        const mountedRef = hooks.useRef(false);
        const pendingRef = hooks.useRef(false);

        hooks.useEffect(() => {
            mountedRef.current = true;
            return () => {
                mountedRef.current = false;
            };
        }, []);

        const submit = hooks.useCallback(
            async (input: ${inputName}): Promise<${resultName}> => {
                if (pendingRef.current) {
                    throw new ActionRequestPendingError();
                }
                pendingRef.current = true;
                if (mountedRef.current) {
                    setSnapshot({ state: 'submitting' });
                }
                try {
                    const result = await client.execute(input);
                    if (mountedRef.current) {
                        setSnapshot({ state: 'success', result });
                    }
                    return result;
                } catch (error: unknown) {
                    if (mountedRef.current) {
                        setSnapshot({ state: 'error', error });
                    }
                    throw error;
                } finally {
                    pendingRef.current = false;
                }
            },
            [client]
        );

        return {
            state: snapshot.state,
            result: snapshot.result,
            error: snapshot.error,
            submit,
        };
    }

    return { ${hookName} };
}
`;
}

export function renderReactActionRequestV2(model) {
    const action = assertActionRequestV2RendererModel(model, 'React');
    const files = {
        'src/models.ts': renderActionRequestV2Models(action, 'React'),
        'src/validation.ts': renderValidation(action),
        [`src/${action.id}.decoder.ts`]: renderDecoder(action),
        [`src/${action.id}.client.ts`]: renderClient(action),
        [`src/use-${action.id}.ts`]: renderHooks(action),
        'src/index.ts': `export * from './models';\nexport * from './validation';\nexport * from './${action.id}.decoder';\nexport * from './${action.id}.client';\nexport * from './use-${action.id}';\n`,
    };
    return { files, actionId: action.id };
}
