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
    renderModels,
    renderValidation,
    requiredPermissions,
} from './shared.mjs';
import {
    renderActionAfterSuccessContract,
    renderAfterSuccessExtension,
} from './after-success-slot.mjs';

function renderClient(semantic) {
    const imports = [...new Set(operationTypes(semantic))].join(', ');
    const methods = semantic.operations
        .map((operation) => {
            const integration = semantic.integrations.find(
                (candidate) => candidate.id === operation.integration_ref
            );
            if (!integration) {
                throw new Error(
                    `angular renderer: missing ${operation.integration_ref}`
                );
            }
            return `    ${camelCase(operation.id)}(input: ${pascalCase(operation.input.name)}): Observable<${pascalCase(operation.output.name)}> {\n        return this.http.${integration.method.toLowerCase()}<${pascalCase(operation.output.name)}>(joinUrl(this.baseUrl, '${integration.path}'), input, {\n            context: new HttpContext().set(PUBLIC_REQUEST, ${integration.authentication === 'none'}),\n        });\n    }`;
        })
        .join('\n\n');
    return `import { HttpClient, HttpContext, HttpContextToken } from '@angular/common/http';\nimport { Injectable, InjectionToken, inject } from '@angular/core';\nimport type { Observable } from 'rxjs';\nimport type { ${imports} } from './models';\n\nexport const ACTION_REQUEST_BASE_URL = new InjectionToken<string>('ACTION_REQUEST_BASE_URL');\nexport const PUBLIC_REQUEST = new HttpContextToken<boolean>(() => false);\n\nfunction joinUrl(baseUrl: string, path: string): string {\n    return [baseUrl.replace(/\\/$/, ''), path.replace(/^\\//, '')].join('/');\n}\n\n@Injectable()\nexport class ActionRequestClient {\n    private readonly http = inject(HttpClient);\n    private readonly baseUrl = inject(ACTION_REQUEST_BASE_URL);\n\n${methods}\n}\n`;
}

function renderCommands(semantic) {
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
    return `import { Injectable, InjectionToken, inject } from '@angular/core';\nimport { ${rxjsImports} } from 'rxjs';\nimport { ActionRequestClient } from './action-request-client';\nimport { afterSuccess } from './after-success.extension';\nimport type { ${[...new Set(imports)].join(', ')} } from './models';\n${sessionContract}${permissionContract}\n@Injectable()\nexport class ActionRequestCommands {\n    private readonly client = inject(ActionRequestClient);${sessionInjection}${permissionInjection}\n\n${methods}\n}\n`;
}

export function renderAngularNx(semantic, artifactPlan, profile) {
    assertArtifactPlan(artifactPlan, semantic, 'semantic-model');
    assertRendererInput(semantic, profile, 'angular-nx');
    const outputRoot = expandProfileValue(
        profile.output_root,
        semantic,
        'output_root'
    );
    const packageName = expandProfileValue(
        profile.package_name,
        semantic,
        'package_name'
    );
    const files = {
        'project.json': `${JSON.stringify(
            {
                name: packageName,
                projectType: 'library',
                sourceRoot: `${outputRoot}/src`,
                tags: ['type:data', 'platform:angular', 'generated:true'],
                targets: {},
            },
            null,
            2
        )}\n`,
        'src/after-success.extension.ts': renderAfterSuccessExtension(),
        'src/action-request-client.ts': renderClient(semantic),
        'src/action-request-commands.ts': renderCommands(semantic),
        'src/extension-contract.ts': renderActionAfterSuccessContract(semantic),
        'src/index.ts': `export * from './action-request-client';\nexport * from './action-request-commands';\nexport * from './after-success.extension';\nexport * from './extension-contract';\nexport * from './models';\nexport * from './validation';\n`,
        'src/models.ts': renderModels(semantic),
        'src/validation.ts': renderValidation(semantic),
        'tsconfig.json': `${JSON.stringify(
            {
                compilerOptions: {
                    strict: true,
                    target: 'ES2022',
                    module: 'ESNext',
                    moduleResolution: 'Bundler',
                    experimentalDecorators: true,
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
        'project.json': 'package-descriptor',
        'src/after-success.extension.ts': 'after-success-extension',
        'src/action-request-client.ts': 'integration-client',
        'src/action-request-commands.ts': 'runtime-binding',
        'src/extension-contract.ts': 'extension-contract',
        'src/index.ts': 'public-api',
        'src/models.ts': 'domain-model',
        'src/validation.ts': 'input-validator',
        'tsconfig.json': 'compiler-configuration',
    });
}
