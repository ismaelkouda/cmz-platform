import { pascalCase } from './shared.mjs';
import {
    assertListQueryV2RendererModel,
    renderListQueryV2Decoder,
    renderListQueryV2Models,
    renderListQueryV2RequestPath,
} from './list-query-v2-renderer-shared.mjs';

function renderClient(query) {
    const className = `${pascalCase(query.id)}Client`;
    const decoderName = `decode${pascalCase(query.id)}Response`;
    const readName = pascalCase(query.read_model.id);
    const hasInput = query.port.input.kind === 'object';
    const inputName = `${pascalCase(query.id)}Input`;
    const modelImports = hasInput ? `${inputName}, ${readName}` : readName;
    const inputParameter = hasInput ? `input: ${inputName}, ` : '';
    const path = hasInput
        ? 'requestPath(input)'
        : JSON.stringify(query.transport.path);
    const requestPath = hasInput
        ? renderListQueryV2RequestPath(query, inputName)
        : '';
    const invalidPayloadImport = hasInput
        ? "import { InvalidPayloadError } from './errors';\n"
        : '';
    const policy = JSON.stringify(query.request_policy, null, 4);
    return `${invalidPayloadImport}import { ${decoderName} } from './${query.id}.decoder';
import type { ${modelImports} } from './models';

export interface ListQueryRequestPolicy {
    readonly authentication:
        | { readonly mode: 'omit' }
        | {
              readonly mode: 'host';
              readonly schemes: readonly {
                  readonly id: string;
                  readonly kind: 'bearer';
              }[];
          };
    readonly cache: {
        readonly mode: 'host';
        readonly scope: 'principal' | 'public';
        readonly refresh: 'bypass';
    };
}

export interface ListQueryFetchResponse {
    readonly ok: boolean;
    readonly status: number;
    json(): Promise<unknown>;
}

export interface ListQueryFetchRequest {
    readonly serviceId: string;
    readonly url: string;
    readonly method: 'GET';
    readonly policy: ListQueryRequestPolicy;
    readonly isRefresh: boolean;
    readonly signal: AbortSignal;
}

export type ListQueryFetchPort = (
    request: ListQueryFetchRequest
) => Promise<ListQueryFetchResponse>;

export interface ListQueryReadOptions {
    readonly isRefresh: boolean;
    readonly signal: AbortSignal;
}

export class ListQueryHttpError extends Error {
    constructor(readonly status: number) {
        super(\`HTTP \${status}\`);
        this.name = 'ListQueryHttpError';
    }
}

const REQUEST_POLICY: ListQueryRequestPolicy = ${policy};

function joinUrl(baseUrl: string, path: string): string {
    const normalizedBaseUrl = baseUrl.endsWith('/')
        ? baseUrl.slice(0, -1)
        : baseUrl;
    const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
    return [normalizedBaseUrl, normalizedPath].join('/');
}

${requestPath}

export class ${className} {
    constructor(
        private readonly baseUrl: string,
        private readonly fetch: ListQueryFetchPort
    ) {}

    async readAll(${inputParameter}options: ListQueryReadOptions): Promise<readonly ${readName}[]> {
        const response = await this.fetch({
            serviceId: ${JSON.stringify(query.transport.service_id)},
            url: joinUrl(this.baseUrl, ${path}),
            method: 'GET',
            policy: REQUEST_POLICY,
            isRefresh: options.isRefresh,
            signal: options.signal,
        });
        if (!response.ok) throw new ListQueryHttpError(response.status);
        return ${decoderName}(await response.json());
    }
}
`;
}

function renderErrors() {
    return `export class InvalidPayloadError extends Error {
    readonly code = 'INVALID_PAYLOAD';

    constructor(
        readonly path: string,
        readonly expected: string
    ) {
        super(\`Invalid payload at \${path}: expected \${expected}\`);
        this.name = 'InvalidPayloadError';
    }
}

export class ServerResponseError extends Error {
    readonly code = 'SERVER_RESPONSE_ERROR';

    constructor(readonly serverMessage: string) {
        super(serverMessage || 'ERRORS.HTTP.SERVER_ERROR');
        this.name = 'ServerResponseError';
    }
}
`;
}

function renderHooks(query) {
    const hookName = `use${pascalCase(query.id)}`;
    const factoryName = `create${pascalCase(query.id)}Hooks`;
    const className = `${pascalCase(query.id)}Client`;
    const readName = pascalCase(query.read_model.id);
    const stateName = `${pascalCase(query.id)}State`;
    const bindingName = `${pascalCase(query.id)}Binding`;
    const hasInput = query.port.input.kind === 'object';
    const inputName = `${pascalCase(query.id)}Input`;
    const modelImports = hasInput ? `${inputName}, ${readName}` : readName;
    const inputRef = hasInput
        ? `        const inputRef = hooks.useRef<${inputName} | undefined>(undefined);\n`
        : '';
    const executeSignature = hasInput
        ? `(input: ${inputName}, nextState: 'loading' | 'reloading', isRefresh: boolean)`
        : `(nextState: 'loading' | 'reloading', isRefresh: boolean)`;
    const clientCall = hasInput
        ? 'client.readAll(input, { isRefresh, signal: controller.signal })'
        : 'client.readAll({ isRefresh, signal: controller.signal })';
    const loadSignature = hasInput
        ? `(input: ${inputName}, options: LoadOptions = {})`
        : `(options: LoadOptions = {})`;
    const rememberInput = hasInput
        ? '            inputRef.current = input;\n'
        : '';
    const loadCall = hasInput
        ? "execute(input, 'loading', options.forceRefresh ?? false)"
        : "execute('loading', options.forceRefresh ?? false)";
    const reloadGuard = hasInput
        ? `            const input = inputRef.current;
            if (!input) throw new Error('reload requires a previous load');
            return execute(input, 'reloading', true);`
        : `            if (!hasLoadedRef.current) {
                throw new Error('reload requires a previous load');
            }
            return execute('reloading', true);`;
    const loadType = hasInput
        ? `(input: ${inputName}, options?: LoadOptions) => Promise<void>`
        : `(options?: LoadOptions) => Promise<void>`;
    return `import type { ${className} } from './${query.id}.client';
import type { ${modelImports} } from './models';

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

export interface LoadOptions {
    readonly forceRefresh?: boolean;
}

export type ${stateName} =
    | 'idle'
    | 'loading'
    | 'success'
    | 'empty'
    | 'error'
    | 'reloading';

interface QuerySnapshot {
    readonly state: ${stateName};
    readonly items: readonly ${readName}[];
    readonly error?: unknown;
}

export interface ${bindingName} {
    readonly state: ${stateName};
    readonly items: readonly ${readName}[];
    readonly error: unknown;
    readonly load: ${loadType};
    readonly reload: () => Promise<void>;
}

export function ${factoryName}(
    hooks: ReactHooksPort,
    client: ${className}
) {
    function ${hookName}(): ${bindingName} {
        const [snapshot, setSnapshot] = hooks.useState<QuerySnapshot>({
            state: 'idle',
            items: [],
        });
        const activeRequestRef = hooks.useRef<AbortController | undefined>(
            undefined
        );
        const sequenceRef = hooks.useRef(0);
        const mountedRef = hooks.useRef(false);
        const hasLoadedRef = hooks.useRef(false);
${inputRef}
        hooks.useEffect(() => {
            mountedRef.current = true;
            return () => {
                mountedRef.current = false;
                activeRequestRef.current?.abort();
            };
        }, []);

        const execute = hooks.useCallback(
            async ${executeSignature}: Promise<void> => {
                activeRequestRef.current?.abort();
                const controller = new AbortController();
                activeRequestRef.current = controller;
                const requestId = sequenceRef.current + 1;
                sequenceRef.current = requestId;
                setSnapshot((previous) => ({
                    state: nextState,
                    items: previous.items,
                }));
                try {
                    const items = await ${clientCall};
                    if (
                        !mountedRef.current ||
                        sequenceRef.current !== requestId ||
                        controller.signal.aborted
                    ) {
                        return;
                    }
                    setSnapshot({
                        state: items.length === 0 ? 'empty' : 'success',
                        items,
                    });
                } catch (error: unknown) {
                    if (
                        !mountedRef.current ||
                        sequenceRef.current !== requestId ||
                        controller.signal.aborted
                    ) {
                        return;
                    }
                    setSnapshot((previous) => ({
                        state: 'error',
                        items: previous.items,
                        error,
                    }));
                    throw error;
                } finally {
                    if (sequenceRef.current === requestId) {
                        activeRequestRef.current = undefined;
                    }
                }
            },
            [client]
        );

        const load = hooks.useCallback(
            ${loadSignature}: Promise<void> => {
${rememberInput}            hasLoadedRef.current = true;
                return ${loadCall};
            },
            [execute]
        );

        const reload = hooks.useCallback(async (): Promise<void> => {
${reloadGuard}
        }, [execute]);

        return {
            state: snapshot.state,
            items: snapshot.items,
            error: snapshot.error,
            load,
            reload,
        };
    }

    return { ${hookName} };
}
`;
}

export function renderReactListQueryV2(model) {
    const query = assertListQueryV2RendererModel(model, 'react');
    const files = {
        'src/models.ts': renderListQueryV2Models(query, 'react'),
        [`src/${query.id}.decoder.ts`]: renderListQueryV2Decoder(
            query,
            'react',
            './errors'
        ),
        'src/errors.ts': renderErrors(),
        [`src/${query.id}.client.ts`]: renderClient(query),
        [`src/use-${query.id}.ts`]: renderHooks(query),
        'src/index.ts': `export * from './models';\nexport * from './errors';\nexport * from './${query.id}.decoder';\nexport * from './${query.id}.client';\nexport * from './use-${query.id}';\n`,
    };
    return { files, queryId: query.id };
}
