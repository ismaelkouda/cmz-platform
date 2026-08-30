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
                    `react list-query renderer: missing ${operation.integration_ref}`
                );
            }
            const item = itemTypeName(operation);
            const isEnveloped = integration.response_envelope === 'simple';
            const unwrapCall = isEnveloped
                ? `        const envelope = (await response.json()) as ResponseEnvelope<${item}[]>;\n        return unwrapResponseEnvelope(envelope);`
                : `        return (await response.json()) as ${item}[];`;
            return `    async ${camelCase(operation.id)}(): Promise<${item}[]> {\n        const response = await this.fetch(joinUrl(this.baseUrl, '${integration.path}'), {\n            method: 'GET',\n            authentication: '${integration.authentication}',\n            headers: { 'content-type': 'application/json' },\n        });\n        if (!response.ok) throw new Error(\`HTTP ${'${response.status}'}\`);\n${unwrapCall}\n    }`;
        })
        .join('\n\n');
    const envelopeContract = hasEnvelope
        ? `\n${renderResponseEnvelopeContract()}\n`
        : '';
    return `import type { ${itemTypes.join(', ')} } from './models';\n\nexport interface FetchResponse {\n    readonly ok: boolean;\n    readonly status: number;\n    json(): Promise<unknown>;\n}\n\nexport type RequestAuthentication = 'none' | 'bearer' | 'session' | 'api_key' | 'other';\n\nexport type FetchPort = (url: string, init: { readonly method: string; readonly authentication: RequestAuthentication; readonly headers: Readonly<Record<string, string>> }) => Promise<FetchResponse>;\n\nfunction joinUrl(baseUrl: string, path: string): string {\n    return [baseUrl.replace(/\\/$/, ''), path.replace(/^\\//, '')].join('/');\n}\n${envelopeContract}\nexport class ListQueryClient {\n    constructor(\n        private readonly baseUrl: string,\n        private readonly fetch: FetchPort\n    ) {}\n\n${methods}\n}\n`;
}

export function renderReactListQuery(semantic, artifactPlan, profile) {
    assertArtifactPlan(artifactPlan, semantic, 'list-query-model');
    assertListQueryRendererInput(semantic, profile, 'react-typescript');
    const packageName = expandProfileValue(
        profile.package_name,
        semantic,
        'package_name'
    );
    const files = {
        'package.json': `${JSON.stringify(
            {
                name: packageName,
                version: '0.0.0',
                private: true,
                dependencies: {},
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
                    jsx: 'react-jsx',
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
        'src/index.ts': 'public-api',
        'src/list-query-client.ts': 'integration-client',
        'src/models.ts': 'domain-model',
        'tsconfig.json': 'compiler-configuration',
    });
}
