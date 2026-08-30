import {
    assertArtifactPlan,
    bindRenderedArtifacts,
} from '../core/artifact-plan.mjs';
import { camelCase, expandProfileValue, renderModels } from './shared.mjs';
import {
    assertListQueryRendererInput,
    itemTypeName,
    renderResponseEnvelopeContract,
} from './list-query-shared.mjs';

function renderClient(semantic) {
    const hasEnvelope = semantic.integrations.some(
        (integration) => integration.response_envelope === 'simple'
    );
    const itemTypes = [
        ...new Set(
            semantic.operations.map((operation) => itemTypeName(operation))
        ),
    ];
    const methods = semantic.operations
        .map((operation) => {
            const integration = semantic.integrations.find(
                (candidate) => candidate.id === operation.integration_ref
            );
            if (!integration) {
                throw new Error(
                    `angular list-query renderer: missing ${operation.integration_ref}`
                );
            }
            const item = itemTypeName(operation);
            const isEnveloped = integration.response_envelope === 'simple';
            const requestType = isEnveloped
                ? `ResponseEnvelope<${item}[]>`
                : `${item}[]`;
            const pipeline = isEnveloped
                ? `.pipe(map(unwrapResponseEnvelope))`
                : '';
            return `    ${camelCase(operation.id)}(): Observable<${item}[]> {\n        return this.http.get<${requestType}>(joinUrl(this.baseUrl, '${integration.path}'), {\n            context: new HttpContext().set(PUBLIC_REQUEST, ${integration.authentication === 'none'}),\n        })${pipeline};\n    }`;
        })
        .join('\n\n');
    const rxjsImports = hasEnvelope
        ? 'map, type Observable'
        : 'type Observable';
    const envelopeContract = hasEnvelope
        ? `\n${renderResponseEnvelopeContract()}\n`
        : '';
    return `import { HttpClient, HttpContext, HttpContextToken } from '@angular/common/http';\nimport { InjectionToken, Service, inject } from '@angular/core';\nimport { ${rxjsImports} } from 'rxjs';\nimport type { ${itemTypes.join(', ')} } from './models';\n\nexport const LIST_QUERY_BASE_URL = new InjectionToken<string>('LIST_QUERY_BASE_URL');\nexport const PUBLIC_REQUEST = new HttpContextToken<boolean>(() => false);\n${envelopeContract}\nfunction joinUrl(baseUrl: string, path: string): string {\n    return [baseUrl.replace(/\\/$/, ''), path.replace(/^\\//, '')].join('/');\n}\n\n// autoProvided:false — dépend de LIST_QUERY_BASE_URL, un token sans valeur\n// par défaut fourni par le composition root (type:app), même doctrine que\n// ActionRequestClient (renderers/angular-nx-renderer.mjs).\n@Service({ autoProvided: false })\nexport class ListQueryClient {\n    private readonly http = inject(HttpClient);\n    private readonly baseUrl = inject(LIST_QUERY_BASE_URL);\n\n${methods}\n}\n`;
}

export function renderAngularListQuery(semantic, artifactPlan, profile) {
    assertArtifactPlan(artifactPlan, semantic, 'list-query-model');
    assertListQueryRendererInput(semantic, profile, 'angular-nx');
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
        'src/index.ts': `export * from './list-query-client';\nexport * from './models';\n`,
        'src/list-query-client.ts': renderClient(semantic),
        'src/models.ts': renderModels(semantic),
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
        'src/index.ts': 'public-api',
        'src/list-query-client.ts': 'integration-client',
        'src/models.ts': 'domain-model',
        'tsconfig.json': 'compiler-configuration',
    });
}
