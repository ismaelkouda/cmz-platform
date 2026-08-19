import {
    assertArtifactPlan,
    bindRenderedArtifacts,
} from '../core/artifact-plan.mjs';

import {
    assertRendererInput,
    camelCase,
    expandProfileValue,
    operationTypes,
    pascalCase,
    renderPermissionContract,
    renderResponseEnvelopeContract,
    renderModels,
    renderValidation,
    requiredPermissions,
} from './shared.mjs';
import {
    renderActionAfterSuccessContract,
    renderAfterSuccessExtension,
} from './after-success-slot.mjs';

/**
 * PLAT-7 (2026-08-19) : pendant technique du même changement côté Angular
 * (`renderers/angular-nx-renderer.mjs`). Quand `integration.response_envelope
 * === 'simple'`, `request<T>()` parse la réponse en `ResponseEnvelope<T>` et
 * la déballe via `unwrapResponseEnvelope` avant de la retourner — les hooks
 * générés par `renderHooks` continuent de recevoir un `Promise<T>` propre,
 * sans jamais connaître la forme de transport réelle.
 */
function renderClient(semantic) {
    const imports = [...new Set(operationTypes(semantic))].join(', ');
    const hasEnvelope = semantic.integrations.some(
        (integration) => integration.response_envelope === 'simple'
    );
    const methods = semantic.operations
        .map((operation) => {
            const integration = semantic.integrations.find(
                (candidate) => candidate.id === operation.integration_ref
            );
            if (!integration) {
                throw new Error(
                    `react renderer: missing ${operation.integration_ref}`
                );
            }
            const output = pascalCase(operation.output.name);
            const isEnveloped = integration.response_envelope === 'simple';
            return `    ${camelCase(operation.id)}(input: ${pascalCase(operation.input.name)}): Promise<${output}> {\n        return this.request<${output}>('${integration.path}', '${integration.method}', '${integration.authentication}', input, ${isEnveloped});\n    }`;
        })
        .join('\n\n');
    const envelopeContract = hasEnvelope
        ? `\n${renderResponseEnvelopeContract()}\n`
        : '';
    const unwrapCall = hasEnvelope
        ? `        if (isEnveloped) {\n            return unwrapResponseEnvelope((await response.json()) as ResponseEnvelope<T>);\n        }\n        return (await response.json()) as T;`
        : '        return (await response.json()) as T;';
    return `import type { ${imports} } from './models';\n\nexport interface FetchResponse {\n    readonly ok: boolean;\n    readonly status: number;\n    json(): Promise<unknown>;\n}\n\nexport type RequestAuthentication = 'none' | 'bearer' | 'session' | 'api_key' | 'other';\n\nexport type FetchPort = (url: string, init: { readonly method: string; readonly authentication: RequestAuthentication; readonly headers: Readonly<Record<string, string>>; readonly body: string }) => Promise<FetchResponse>;\n\nfunction joinUrl(baseUrl: string, path: string): string {\n    return [baseUrl.replace(/\\/$/, ''), path.replace(/^\\//, '')].join('/');\n}\n${envelopeContract}\nexport class ActionRequestClient {\n    constructor(\n        private readonly baseUrl: string,\n        private readonly fetch: FetchPort\n    ) {}\n\n${methods}\n\n    private async request<T>(path: string, method: string, authentication: RequestAuthentication, input: unknown, isEnveloped: boolean): Promise<T> {\n        const response = await this.fetch(joinUrl(this.baseUrl, path), {\n            method,\n            authentication,\n            headers: { 'content-type': 'application/json' },\n            body: JSON.stringify(input),\n        });\n        if (!response.ok) throw new Error(\`HTTP ${'${response.status}'}\`);\n${unwrapCall}\n    }\n}\n`;
}

function renderHooks(semantic) {
    const imports = [...new Set(operationTypes(semantic))];
    const hasAuthorizedOperation = semantic.operations.some(
        (operation) => operation.access.mode === 'authorized'
    );
    const hasSessionEffect = semantic.operations.some((operation) =>
        operation.effects.some((effect) => effect.kind === 'establish_session')
    );
    if (hasSessionEffect) {
        imports.push('AuthenticationToken', 'CurrentUser');
    }
    const hooks = semantic.operations
        .map((operation) => {
            const method = camelCase(operation.id);
            const hook = `use${pascalCase(operation.id)}`;
            const input = pascalCase(operation.input.name);
            const output = pascalCase(operation.output.name);
            const persist = operation.effects.some(
                (effect) => effect.kind === 'establish_session'
            )
                ? '\n                await session.persist(result.user, result.token);'
                : '';
            const permissions = requiredPermissions(operation);
            const authorization = permissions.length
                ? `\n                assertRequiredPermissions(permissionPort, ${JSON.stringify(permissions)});`
                : '';
            const dependencies = [
                'client',
                ...(permissions.length ? ['permissionPort'] : []),
                ...(persist ? ['session'] : []),
            ];
            return `    function ${hook}(): CommandBinding<${input}, ${output}> {\n        const [state, setState] = hooks.useState<CommandState<${output}>>({ status: 'idle' });\n        const execute = hooks.useCallback(async (input: ${input}) => {\n            setState({ status: 'pending' });\n            try {${authorization}\n                const result = await client.${method}(input);${persist}\n                await afterSuccess({ operationId: '${operation.id}', output: result });\n                setState({ status: 'success', value: result });\n                return result;\n            } catch (error: unknown) {\n                setState({ status: 'error', error });\n                throw error;\n            }\n        }, [${dependencies.join(', ')}]);\n        return { state, execute };\n    }`;
        })
        .join('\n\n');
    const returned = semantic.operations
        .map((operation) => `use${pascalCase(operation.id)}`)
        .join(', ');
    const sessionContract = `\nimport { afterSuccess } from './after-success.extension';\n${
        hasSessionEffect
            ? `\nexport interface SessionPort {\n    persist(user: CurrentUser, token: AuthenticationToken): Promise<void>;\n}\n`
            : ''
    }`;
    const sessionParameter = hasSessionEffect
        ? ',\n    session: SessionPort'
        : '';
    const permissionContract = hasAuthorizedOperation
        ? `\n${renderPermissionContract()}\n`
        : '';
    const permissionParameter = hasAuthorizedOperation
        ? ',\n    permissionPort: PermissionPort'
        : '';
    return `import type { ActionRequestClient } from './action-request-client';\nimport type { ${[...new Set(imports)].join(', ')} } from './models';\n\nexport type StateSetter<T> = (value: T) => void;\n\nexport interface ReactHooksPort {\n    useState<T>(initial: T): readonly [T, StateSetter<T>];\n    useCallback<TArguments extends unknown[], TResult>(\n        callback: (...arguments_: TArguments) => TResult,\n        dependencies: readonly unknown[]\n    ): (...arguments_: TArguments) => TResult;\n}\n${sessionContract}${permissionContract}\nexport type CommandState<T> =\n    | { readonly status: 'idle' }\n    | { readonly status: 'pending' }\n    | { readonly status: 'success'; readonly value: T }\n    | { readonly status: 'error'; readonly error: unknown };\n\nexport interface CommandBinding<TInput, TOutput> {\n    readonly state: CommandState<TOutput>;\n    readonly execute: (input: TInput) => Promise<TOutput>;\n}\n\nexport function createActionRequestHooks(\n    hooks: ReactHooksPort,\n    client: ActionRequestClient${permissionParameter}${sessionParameter}\n) {\n${hooks}\n\n    return { ${returned} };\n}\n`;
}

export function renderReactTypescript(semantic, artifactPlan, profile) {
    assertArtifactPlan(artifactPlan, semantic, 'semantic-model');
    assertRendererInput(semantic, profile, 'react-typescript');
    const packageName = expandProfileValue(
        profile.package_name,
        semantic,
        'package_name'
    );
    const files = {
        'package.json': `${JSON.stringify(
            {
                name: packageName,
                private: true,
                type: 'module',
                peerDependencies: { react: '>=18' },
            },
            null,
            2
        )}\n`,
        'src/after-success.extension.ts': renderAfterSuccessExtension(),
        'src/action-request-client.ts': renderClient(semantic),
        'src/extension-contract.ts': renderActionAfterSuccessContract(semantic),
        'src/index.ts': `export * from './action-request-client';\nexport * from './after-success.extension';\nexport * from './extension-contract';\nexport * from './models';\nexport * from './use-action-request-commands';\nexport * from './validation';\n`,
        'src/models.ts': renderModels(semantic),
        'src/use-action-request-commands.ts': renderHooks(semantic),
        'src/validation.ts': renderValidation(semantic),
        'tsconfig.json': `${JSON.stringify(
            {
                compilerOptions: {
                    strict: true,
                    target: 'ES2022',
                    module: 'ESNext',
                    moduleResolution: 'Bundler',
                    noEmit: true,
                    skipLibCheck: true,
                },
                include: ['src/**/*.ts'],
            },
            null,
            2
        )}\n`,
    };
    return bindRenderedArtifacts(artifactPlan, files, {
        'package.json': 'package-descriptor',
        'src/after-success.extension.ts': 'after-success-extension',
        'src/action-request-client.ts': 'integration-client',
        'src/extension-contract.ts': 'extension-contract',
        'src/index.ts': 'public-api',
        'src/models.ts': 'domain-model',
        'src/use-action-request-commands.ts': 'runtime-binding',
        'src/validation.ts': 'input-validator',
        'tsconfig.json': 'compiler-configuration',
    });
}
