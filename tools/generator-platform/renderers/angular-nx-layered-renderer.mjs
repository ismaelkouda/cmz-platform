/**
 * angular-nx-layered-renderer.mjs — étape 2 du chantier « générateur en
 * couches » (ADR-0003 §5d).
 *
 * Produit la même substance que `renderAngularNx` (angular-nx-renderer.mjs)
 * mais répartie dans 3 packages Nx distincts (domain/data/application),
 * conformes au gabarit écrit à la main libs/newsletter-angular/{domain,
 * data,application} — au lieu d'un seul package plat.
 *
 * DÉLIBÉRÉMENT NON BRANCHÉ : ni render-targets.mjs, ni
 * generate-action-request.mjs, ni le pipeline de publication
 * (core/generation-change-set.mjs, core/generation-publication.mjs) ne
 * connaissent cette fonction. Elle n'est exercée que par
 * renderers-layered.test.mjs, en golden-test contre le code manuel
 * existant. Voir le plan associé (audit staff, 2026-08-28) pour les
 * étapes 3+ (brancher réellement au pipeline de publication).
 *
 * Boundary respectée (ADR-0003 §4, type:application ne dépend jamais de
 * type:data) : le pattern port/token du gabarit manuel est reproduit —
 * ActionRequestPort (interface pure) en domain, ACTION_REQUEST_PORT
 * (InjectionToken) colocalisé en application, ActionRequestClient
 * (implémentation concrète) en data, implements ActionRequestPort.
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

function domainPackageName(basePackageName) {
    return `@cmz/${basePackageName}-domain`;
}
function dataPackageName(basePackageName) {
    return `@cmz/${basePackageName}-data`;
}
function applicationPackageName(basePackageName) {
    return `@cmz/${basePackageName}-application`;
}

function renderPortInterface(semantic) {
    const imports = [...new Set(operationTypes(semantic))].join(', ');
    const hasEnvelope = semantic.integrations.some(
        (integration) => integration.response_envelope === 'simple'
    );
    const envelopeContract = hasEnvelope
        ? `\n${renderResponseEnvelopeContract()}\n`
        : '';
    const methods = semantic.operations
        .map((operation) => {
            const output = pascalCase(operation.output.name);
            return `    ${camelCase(operation.id)}(input: ${pascalCase(operation.input.name)}): Observable<${output}>;`;
        })
        .join('\n');
    return `import type { Observable } from 'rxjs';
import type { ${imports} } from './models';
${envelopeContract}
// Port (interface pure, 0 import framework) — application dépend de ce
// contrat, jamais de l'implémentation concrète (data). Généré depuis le
// même modèle sémantique que l'implémentation data — voir
// renderClientImplementation dans ce fichier.
export interface ActionRequestPort {
${methods}
}
`;
}

/**
 * Implémentation concrète du port (data). Identique en substance à
 * `renderClient` de angular-nx-renderer.mjs, mais `implements
 * ActionRequestPort` (importé depuis le package domain) et n'exporte plus
 * l'InjectionToken de base URL avec le même nom que le port lui-même.
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
                    `angular layered renderer: missing ${operation.integration_ref}`
                );
            }
            const output = pascalCase(operation.output.name);
            const isEnveloped = integration.response_envelope === 'simple';
            const requestType = isEnveloped
                ? `ResponseEnvelope<${output}>`
                : output;
            const pipeline = isEnveloped
                ? `.pipe(map(unwrapResponseEnvelope))`
                : '';
            return `    ${camelCase(operation.id)}(input: ${pascalCase(operation.input.name)}): Observable<${output}> {\n        return this.http.${integration.method.toLowerCase()}<${requestType}>(joinUrl(this.baseUrl, '${integration.path}'), input, {\n            context: new HttpContext().set(PUBLIC_REQUEST, ${integration.authentication === 'none'}),\n        })${pipeline};\n    }`;
        })
        .join('\n\n');
    const rxjsImports = hasEnvelope
        ? 'map, type Observable'
        : 'type Observable';
    const envelopeContract = hasEnvelope
        ? `\n${renderResponseEnvelopeContract()}\n`
        : '';
    return `import { HttpClient, HttpContext, HttpContextToken } from '@angular/common/http';\nimport { InjectionToken, Service, inject } from '@angular/core';\nimport { ${rxjsImports} } from 'rxjs';\nimport type { ActionRequestPort } from '${domainPkg}';\nimport type { ${imports} } from '${domainPkg}';\n\nexport const ACTION_REQUEST_BASE_URL = new InjectionToken<string>('ACTION_REQUEST_BASE_URL');\nexport const PUBLIC_REQUEST = new HttpContextToken<boolean>(() => false);\n${envelopeContract}\nfunction joinUrl(baseUrl: string, path: string): string {\n    return [baseUrl.replace(/\\/$/, ''), path.replace(/^\\//, '')].join('/');\n}\n\n// autoProvided:false — dépend de ACTION_REQUEST_BASE_URL, un token sans\n// valeur par défaut fourni par le composition root (type:app).\n@Service({ autoProvided: false })\nexport class ActionRequestClient implements ActionRequestPort {\n    private readonly http = inject(HttpClient);\n    private readonly baseUrl = inject(ACTION_REQUEST_BASE_URL);\n\n${methods}\n}\n`;
}

function renderPortToken(domainPkg) {
    return `import { InjectionToken } from '@angular/core';
import type { ActionRequestPort } from '${domainPkg}';

// Jeton d'injection pour ActionRequestPort (ADR-0024) — colocalisé dans
// application, pas domain, qui ne dépend d'aucun framework. Le composition
// root (type:app) fournit l'implémentation concrète (type:data) via
// useExisting.
export const ACTION_REQUEST_PORT = new InjectionToken<ActionRequestPort>(
    'ActionRequestPort'
);
`;
}

function renderCommands(semantic, domainPkg) {
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
    const methods = semantic.operations
        .map((operation) => {
            const method = camelCase(operation.id);
            const input = pascalCase(operation.input.name);
            const output = pascalCase(operation.output.name);
            const establishesSession = operation.effects.some(
                (effect) => effect.kind === 'establish_session'
            );
            const permissions = requiredPermissions(operation);
            const authorizationStart = permissions.length
                ? `        return defer(() => {\n            assertRequiredPermissions(this.permissionPort, ${JSON.stringify(permissions)});\n`
                : '';
            const authorizationEnd = permissions.length ? '\n        });' : '';
            if (!establishesSession) {
                const body = `return this.client.${method}(input).pipe(\n                switchMap((result) =>\n                    from(afterSuccess({ operationId: '${operation.id}', output: result })).pipe(\n                        map(() => result)\n                    )\n                )\n            );`;
                if (permissions.length) {
                    return `    ${method}(input: ${input}): Observable<${output}> {\n${authorizationStart}            ${body}${authorizationEnd}\n    }`;
                }
                return `    ${method}(input: ${input}): Observable<${output}> {\n        ${body.replaceAll('\n            ', '\n        ')}\n    }`;
            }
            const body = `return this.client.${method}(input).pipe(\n                switchMap((result) =>\n                    from(this.session.persist(result.user, result.token)).pipe(\n                        switchMap(() =>\n                            from(afterSuccess({ operationId: '${operation.id}', output: result }))\n                        ),\n                        map(() => result)\n                    )\n                )\n            );`;
            if (permissions.length) {
                return `    ${method}(input: ${input}): Observable<${output}> {\n${authorizationStart}            ${body}${authorizationEnd}\n    }`;
            }
            return `    ${method}(input: ${input}): Observable<${output}> {\n        ${body.replaceAll('\n            ', '\n        ')}\n    }`;
        })
        .join('\n\n');
    const sessionContract = hasSessionEffect
        ? `\nexport interface SessionPort {\n    persist(user: CurrentUser, token: AuthenticationToken): Promise<void>;\n}\n\nexport const SESSION_PORT = new InjectionToken<SessionPort>('SESSION_PORT');\n`
        : '';
    const sessionInjection = hasSessionEffect
        ? '\n    private readonly session = inject(SESSION_PORT);'
        : '';
    const permissionContract = hasAuthorizedOperation
        ? `\n${renderPermissionContract()}\n\nexport const PERMISSION_PORT = new InjectionToken<PermissionPort>('PERMISSION_PORT');\n`
        : '';
    const permissionInjection = hasAuthorizedOperation
        ? '\n    private readonly permissionPort = inject(PERMISSION_PORT);'
        : '';
    const rxjsImports = hasAuthorizedOperation
        ? 'defer, from, map, switchMap, type Observable'
        : 'from, map, switchMap, type Observable';
    return `import { InjectionToken, Service, inject } from '@angular/core';\nimport { ${rxjsImports} } from 'rxjs';\nimport { ACTION_REQUEST_PORT } from './action-request-port.token';\nimport { afterSuccess } from './after-success.extension';\nimport type { ${[...new Set(imports)].join(', ')} } from '${domainPkg}';\n${sessionContract}${permissionContract}\n// autoProvided:false — dépend de ACTION_REQUEST_PORT, jamais directement de\n// type:data (ADR-0003 §4). Voir action-request-port.token.ts.\n@Service({ autoProvided: false })\nexport class ActionRequestCommands {\n    private readonly client = inject(ACTION_REQUEST_PORT);${sessionInjection}${permissionInjection}\n\n${methods}\n}\n`;
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

function projectJson(name, sourceRoot, tags) {
    return `${JSON.stringify(
        { name, projectType: 'library', sourceRoot, tags, targets: {} },
        null,
        2
    )}\n`;
}

function tsconfigJson({ experimentalDecorators }) {
    return `${JSON.stringify(
        {
            compilerOptions: {
                strict: true,
                target: 'ES2022',
                module: 'ESNext',
                moduleResolution: 'Bundler',
                ...(experimentalDecorators
                    ? { experimentalDecorators: true }
                    : {}),
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
 * même contrat de sortie que bindRenderedArtifacts, mais un par couche.
 * `artifactPlan` doit provenir de buildArtifactPlan (étape 1, champ
 * `layer` présent) : cette fonction route chaque fichier vers la couche
 * déclarée par le plan pour la responsabilité correspondante, elle ne
 * réinvente pas le mapping.
 */
export function renderAngularNxLayered(semantic, artifactPlan, profile) {
    assertArtifactPlan(artifactPlan, semantic, 'semantic-model');
    assertRendererInput(semantic, profile, 'angular-nx-layered');
    const outputRoot = expandProfileValue(
        profile.output_root,
        semantic,
        'output_root'
    );
    const basePackageName = expandProfileValue(
        profile.package_name,
        semantic,
        'package_name'
    );
    const domainPkg = domainPackageName(basePackageName);
    const dataPkg = dataPackageName(basePackageName);
    const applicationPkg = applicationPackageName(basePackageName);

    const domainFiles = {
        'project.json': projectJson(domainPkg, `${outputRoot}/domain/src`, [
            'type:domain',
            'platform:angular',
            'generated:true',
        ]),
        'src/action-request-port.ts': renderPortInterface(semantic),
        'src/models.ts': renderModels(semantic),
        'src/validation.ts': renderValidation(semantic),
        'src/index.ts': `export type { ActionRequestPort } from './action-request-port';\nexport * from './models';\nexport * from './validation';\n`,
        'tsconfig.json': tsconfigJson({ experimentalDecorators: false }),
    };
    const domainArtifacts = bindLayeredArtifacts(
        artifactPlan,
        'domain',
        domainFiles,
        {
            'project.json': 'package-descriptor',
            // Le port (interface pure, 0 import framework) est un contrat
            // du domaine au même titre que les types — layer 'domain'
            // dans le catalogue (core/artifact-plan.mjs), donc rattaché à
            // la responsabilité domain-model, pas integration-client (qui
            // reste 'data' : l'implémentation HTTP concrète).
            'src/action-request-port.ts': 'domain-model',
            'src/models.ts': 'domain-model',
            'src/validation.ts': 'input-validator',
            'src/index.ts': 'public-api',
            'tsconfig.json': 'compiler-configuration',
        }
    );

    const dataFiles = {
        'project.json': projectJson(dataPkg, `${outputRoot}/data/src`, [
            'type:data',
            'platform:angular',
            'generated:true',
        ]),
        'src/action-request-client.ts': renderClientImplementation(
            semantic,
            domainPkg
        ),
        'src/index.ts': `export * from './action-request-client';\n`,
        'tsconfig.json': tsconfigJson({ experimentalDecorators: true }),
    };
    const dataArtifacts = bindLayeredArtifacts(
        artifactPlan,
        'data',
        dataFiles,
        {
            'project.json': 'package-descriptor',
            'src/action-request-client.ts': 'integration-client',
            'src/index.ts': 'public-api',
            'tsconfig.json': 'compiler-configuration',
        }
    );

    const applicationFiles = {
        'project.json': projectJson(
            applicationPkg,
            `${outputRoot}/application/src`,
            ['type:application', 'platform:angular', 'generated:true']
        ),
        'src/action-request-port.token.ts': renderPortToken(domainPkg),
        'src/action-request-commands.ts': renderCommands(semantic, domainPkg),
        'src/after-success.extension.ts': renderAfterSuccessExtension(),
        'src/extension-contract.ts': renderExtensionContract(
            semantic,
            domainPkg
        ),
        'src/index.ts': `export * from './action-request-commands';\nexport * from './action-request-port.token';\nexport * from './after-success.extension';\nexport * from './extension-contract';\n`,
        'tsconfig.json': tsconfigJson({ experimentalDecorators: true }),
    };
    const applicationArtifacts = bindLayeredArtifacts(
        artifactPlan,
        'application',
        applicationFiles,
        {
            'project.json': 'package-descriptor',
            'src/action-request-port.token.ts': 'runtime-binding',
            'src/action-request-commands.ts': 'runtime-binding',
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
