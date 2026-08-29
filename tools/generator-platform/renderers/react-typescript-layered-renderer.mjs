/**
 * react-typescript-layered-renderer.mjs — étape 2 (React) du chantier
 * « générateur en couches » (ADR-0003 §5d).
 *
 * Produit la même substance que `renderReactTypescript`
 * (react-typescript-renderer.mjs) mais répartie dans 3 packages Nx
 * distincts (domain/data/application), suivant le pattern conçu à
 * l'origine sur un POC écrit à la main (2026-08-27, depuis retiré) — au
 * lieu d'un seul package plat. Symétrique de
 * angular-nx-layered-renderer.mjs.
 *
 * DÉLIBÉRÉMENT NON BRANCHÉ (à ce stade) : ni render-targets.mjs, ni
 * generate-action-request.mjs, ni le pipeline de publication
 * (core/generation-change-set.mjs, core/generation-publication.mjs) ne
 * connaissent cette fonction. Elle n'est exercée que par
 * renderers-layered-react.test.mjs.
 *
 * Différence structurelle avec Angular : pas de framework DI côté React,
 * donc pas d'InjectionToken séparé. `ActionRequestPort` (interface pure,
 * domain) est directement le type de paramètre attendu par
 * `createActionRequestHooks` (application) — la valeur concrète
 * (`ActionRequestClient`, data) est fournie par l'app hôte au point de
 * composition, exactement comme dans le POC d'origine.
 *
 * Boundary respectée (ADR-0003 §4, type:application ne dépend jamais de
 * type:data) : application importe uniquement le port depuis domain,
 * jamais ActionRequestClient depuis data.
 */
import { assertArtifactPlan } from '../core/artifact-plan.mjs';
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
import { renderAfterSuccessExtension } from './after-success-slot.mjs';
import { bindLayeredArtifacts } from './layered-artifact-binding.mjs';

// Exportées : seule source de vérité pour dériver les 3 noms de package
// en couches depuis un package_name de base — render-targets.mjs (étape
// 3, quand branché) les réutilise plutôt que de dupliquer cette règle de
// nommage, comme pour le pendant Angular.
export function domainPackageName(basePackageName) {
    return `@cmz/${basePackageName}-domain`;
}
export function dataPackageName(basePackageName) {
    return `@cmz/${basePackageName}-data`;
}
export function applicationPackageName(basePackageName) {
    return `@cmz/${basePackageName}-application`;
}

function renderPortInterface(semantic) {
    const imports = [...new Set(operationTypes(semantic))].join(', ');
    const methods = semantic.operations
        .map((operation) => {
            const output = pascalCase(operation.output.name);
            return `    ${camelCase(operation.id)}(input: ${pascalCase(operation.input.name)}): Promise<${output}>;`;
        })
        .join('\n');
    return `import type { ${imports} } from './models';

// Port (interface pure, 0 import framework) — application dépend de ce
// contrat, jamais de l'implémentation concrète (data). Pas de DI
// framework côté React (contrairement à l'équivalent Angular) : ce port
// est directement le type de paramètre attendu par
// createActionRequestHooks(), câblé par l'app hôte au point de
// composition.
export interface ActionRequestPort {
${methods}
}
`;
}

/**
 * Implémentation concrète du port (data). Identique en substance à
 * `renderClient` de react-typescript-renderer.mjs, mais `implements
 * ActionRequestPort` (importé depuis le package domain).
 */
function renderClientImplementation(semantic, domainPkg) {
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
                    `react layered renderer: missing ${operation.integration_ref}`
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
    // Le paramètre isEnveloped n'est lu que dans unwrapCall quand hasEnvelope
    // est vrai (voir ci-dessus). Quand ce domaine n'a aucune intégration
    // enveloppée, la signature de request<T> reste uniforme (tous les appels
    // de méthode le passent) mais le corps ne le consulte jamais — préfixer
    // `_` pour rester conforme à @typescript-eslint/no-unused-vars
    // (argsIgnorePattern: '^_', voir eslint.config.mjs) sans changer la
    // signature entre les deux cas.
    const requestIsEnvelopedParameter = hasEnvelope
        ? 'isEnveloped: boolean'
        : '_isEnveloped: boolean';
    return `import type { ActionRequestPort } from '${domainPkg}';\nimport type { ${imports} } from '${domainPkg}';\n\nexport interface FetchResponse {\n    readonly ok: boolean;\n    readonly status: number;\n    json(): Promise<unknown>;\n}\n\nexport type RequestAuthentication = 'none' | 'bearer' | 'session' | 'api_key' | 'other';\n\nexport type FetchPort = (url: string, init: { readonly method: string; readonly authentication: RequestAuthentication; readonly headers: Readonly<Record<string, string>>; readonly body: string }) => Promise<FetchResponse>;\n\nfunction joinUrl(baseUrl: string, path: string): string {\n    return [baseUrl.replace(/\\/$/, ''), path.replace(/^\\//, '')].join('/');\n}\n${envelopeContract}\nexport class ActionRequestClient implements ActionRequestPort {\n    constructor(\n        private readonly baseUrl: string,\n        private readonly fetch: FetchPort\n    ) {}\n\n${methods}\n\n    private async request<T>(path: string, method: string, authentication: RequestAuthentication, input: unknown, ${requestIsEnvelopedParameter}): Promise<T> {\n        const response = await this.fetch(joinUrl(this.baseUrl, path), {\n            method,\n            authentication,\n            headers: { 'content-type': 'application/json' },\n            body: JSON.stringify(input),\n        });\n        if (!response.ok) throw new Error(\`HTTP ${'${response.status}'}\`);\n${unwrapCall}\n    }\n}\n`;
}

function renderHooks(semantic, domainPkg) {
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
    // client : ActionRequestPort — l'application ne dépend que du contrat
    // (ADR-0003 §4), jamais de data directement. L'app hôte instancie
    // ActionRequestClient (qui implémente ActionRequestPort) et le passe
    // ici au point de composition.
    return `import type { ActionRequestPort } from '${domainPkg}';\nimport type { ${[...new Set(imports)].join(', ')} } from '${domainPkg}';\n\nexport type StateSetter<T> = (value: T) => void;\n\nexport interface ReactHooksPort {\n    useState<T>(initial: T): readonly [T, StateSetter<T>];\n    useCallback<TArguments extends unknown[], TResult>(\n        callback: (...arguments_: TArguments) => TResult,\n        dependencies: readonly unknown[]\n    ): (...arguments_: TArguments) => TResult;\n}\n${sessionContract}${permissionContract}\nexport type CommandState<T> =\n    | { readonly status: 'idle' }\n    | { readonly status: 'pending' }\n    | { readonly status: 'success'; readonly value: T }\n    | { readonly status: 'error'; readonly error: unknown };\n\nexport interface CommandBinding<TInput, TOutput> {\n    readonly state: CommandState<TOutput>;\n    readonly execute: (input: TInput) => Promise<TOutput>;\n}\n\nexport function createActionRequestHooks(\n    hooks: ReactHooksPort,\n    client: ActionRequestPort${permissionParameter}${sessionParameter}\n) {\n${hooks}\n\n    return { ${returned} };\n}\n`;
}

function renderExtensionContract(semantic, domainPkg) {
    const outputs = [
        ...new Set(
            semantic.operations.map((operation) =>
                pascalCase(operation.output.name)
            )
        ),
    ];
    const variants = semantic.operations
        .map(
            (operation) =>
                `    | { readonly operationId: '${operation.id}'; readonly output: ${pascalCase(operation.output.name)} }`
        )
        .join('\n');
    return `import type { ${outputs.join(', ')} } from '${domainPkg}';

export type AfterSuccessContext =
${variants};

export type AfterSuccessExtension = (
    context: AfterSuccessContext
) => Promise<void>;
`;
}

function packageJson(name) {
    return `${JSON.stringify(
        {
            name,
            private: true,
            type: 'module',
            peerDependencies: { react: '>=18' },
        },
        null,
        2
    )}\n`;
}

function tsconfigJson() {
    return `${JSON.stringify(
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
    )}\n`;
}

/**
 * Retourne { domain, data, application }, chacun { files, artifacts } —
 * même contrat de sortie que renderAngularNxLayered. `artifactPlan` doit
 * provenir de buildArtifactPlan (étape 1, champ `layer` présent) : cette
 * fonction route chaque fichier vers la couche déclarée par le plan pour
 * la responsabilité correspondante.
 */
export function renderReactTypescriptLayered(semantic, artifactPlan, profile) {
    assertArtifactPlan(artifactPlan, semantic, 'semantic-model');
    assertRendererInput(semantic, profile, 'react-typescript-layered');
    const basePackageName = expandProfileValue(
        profile.package_name,
        semantic,
        'package_name'
    );
    const domainPkg = domainPackageName(basePackageName);

    const domainFiles = {
        'package.json': packageJson(domainPkg),
        'src/action-request-port.ts': renderPortInterface(semantic),
        'src/models.ts': renderModels(semantic),
        'src/validation.ts': renderValidation(semantic),
        'src/index.ts': `export type { ActionRequestPort } from './action-request-port';\nexport * from './models';\nexport * from './validation';\n`,
        'tsconfig.json': tsconfigJson(),
    };
    const domainArtifacts = bindLayeredArtifacts(
        artifactPlan,
        'domain',
        domainFiles,
        {
            'package.json': 'package-descriptor',
            // Comme côté Angular : le port est un contrat du domaine
            // (layer 'domain' dans le catalogue, core/artifact-plan.mjs),
            // rattaché à domain-model, pas integration-client (data :
            // l'implémentation HTTP concrète).
            'src/action-request-port.ts': 'domain-model',
            'src/models.ts': 'domain-model',
            'src/validation.ts': 'input-validator',
            'src/index.ts': 'public-api',
            'tsconfig.json': 'compiler-configuration',
        }
    );

    const dataPkg = dataPackageName(basePackageName);
    const dataFiles = {
        'package.json': packageJson(dataPkg),
        'src/action-request-client.ts': renderClientImplementation(
            semantic,
            domainPkg
        ),
        'src/index.ts': `export * from './action-request-client';\n`,
        'tsconfig.json': tsconfigJson(),
    };
    const dataArtifacts = bindLayeredArtifacts(
        artifactPlan,
        'data',
        dataFiles,
        {
            'package.json': 'package-descriptor',
            'src/action-request-client.ts': 'integration-client',
            'src/index.ts': 'public-api',
            'tsconfig.json': 'compiler-configuration',
        }
    );

    const applicationPkg = applicationPackageName(basePackageName);
    const applicationFiles = {
        'package.json': packageJson(applicationPkg),
        'src/use-action-request-commands.ts': renderHooks(semantic, domainPkg),
        'src/after-success.extension.ts': renderAfterSuccessExtension(),
        'src/extension-contract.ts': renderExtensionContract(
            semantic,
            domainPkg
        ),
        'src/index.ts': `export * from './use-action-request-commands';\nexport * from './after-success.extension';\nexport * from './extension-contract';\n`,
        'tsconfig.json': tsconfigJson(),
    };
    const applicationArtifacts = bindLayeredArtifacts(
        artifactPlan,
        'application',
        applicationFiles,
        {
            'package.json': 'package-descriptor',
            'src/use-action-request-commands.ts': 'runtime-binding',
            'src/after-success.extension.ts': 'after-success-extension',
            'src/extension-contract.ts': 'extension-contract',
            'src/index.ts': 'public-api',
            'tsconfig.json': 'compiler-configuration',
        }
    );

    return {
        domain: domainArtifacts,
        data: dataArtifacts,
        application: applicationArtifacts,
    };
}
