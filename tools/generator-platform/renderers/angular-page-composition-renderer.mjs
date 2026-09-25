import { camelCase, pascalCase } from './shared.mjs';

export const ANGULAR_PAGE_COMPOSITION_CAPABILITIES = Object.freeze([
    'action.concurrency.reject-while-pending@1',
    'action.idempotency.none@1',
    'action.invalidation.caller-declared@1',
    'action.invalidation.none@1',
    'action.post-success.none@1',
    'action.retry.none@1',
    'composition.independent-node-state@1',
    'composition.producer-node-binding@1',
    'host.authentication.bearer@1',
    'host.authentication.omit@1',
    'query.cache.host.principal@1',
    'query.cache.host.public@1',
    'query.cancellation.on-destroy@1',
    'query.cancellation.on-superseded@1',
    'query.concurrency.latest-wins@1',
    'query.retry.none@1',
    'query.stale-data.reload-preserve.error-preserve@1',
]);

function fail(message) {
    throw new Error(`angular page composition renderer: ${message}`);
}

function assertTarget(node, target, kind) {
    if (!target || typeof target !== 'object') {
        fail(`${node.id} has no rendered primitive target`);
    }
    const targetId = kind === 'query' ? target.queryId : target.actionId;
    if (targetId !== node.primitive_ref.operation_id) {
        fail(
            `${node.id} target operation differs from its primitive reference`
        );
    }
    if (!target.files || !Array.isArray(target.artifacts)) {
        fail(`${node.id} target is incomplete`);
    }
}

function nodeDescriptor(kind, node, target) {
    assertTarget(node, target, kind);
    const operationId = node.primitive_ref.operation_id;
    const operationName = pascalCase(operationId);
    return {
        kind,
        node,
        target,
        facadeName: `${operationName}Facade`,
        sourceName: `${operationName}Source`,
        facadeAlias: `${pascalCase(node.id)}NodeFacade`,
        sourceAlias: `${pascalCase(node.id)}NodeSource`,
        propertyName: camelCase(node.id),
        root: `src/nodes/${node.id}`,
    };
}

function renderComposition(descriptors) {
    const imports = descriptors
        .map(
            ({ facadeName, facadeAlias, node }) =>
                `import { ${facadeName} as ${facadeAlias} } from './nodes/${node.id}/${node.primitive_ref.operation_id}.facade';`
        )
        .join('\n');
    const queryDescriptors = descriptors.filter(({ kind }) => kind === 'query');
    const commandDescriptors = descriptors.filter(
        ({ kind }) => kind === 'command'
    );
    const directCommandDescriptors = commandDescriptors.filter(
        ({ node }) => node.invalidates.length === 0
    );
    const orchestratedCommandDescriptors = commandDescriptors.filter(
        ({ node }) => node.invalidates.length > 0
    );
    const queryProperties = queryDescriptors
        .map(
            ({ facadeAlias, propertyName }) =>
                `    readonly ${propertyName} = inject(${facadeAlias});`
        )
        .join('\n');
    const directCommandProperties = directCommandDescriptors
        .map(
            ({ facadeAlias, propertyName }) =>
                `    readonly ${propertyName} = inject(${facadeAlias});`
        )
        .join('\n');
    const commandFacades = orchestratedCommandDescriptors
        .map(
            ({ facadeAlias, propertyName }) =>
                `    private readonly ${propertyName}Facade = inject(${facadeAlias});`
        )
        .join('\n');
    const descriptorById = new Map(
        queryDescriptors.map((descriptor) => [descriptor.node.id, descriptor])
    );
    const commandProperties = orchestratedCommandDescriptors
        .map(({ facadeAlias, propertyName, node }) => {
            const invalidationStatements = node.invalidates.map((targetId) => {
                const target = descriptorById.get(targetId);
                if (!target) {
                    fail(
                        `${node.id} invalidates missing query node ${targetId}`
                    );
                }
                return `                    this.${target.propertyName}.reload();`;
            });
            const invocation = `this.${propertyName}Facade.submit(input)`;
            const submit =
                invalidationStatements.length === 0
                    ? invocation
                    : `${invocation}.pipe(\n                tap(() => {\n${invalidationStatements.join('\n')}\n                })\n            )`;
            return `    readonly ${propertyName} = {
        state: this.${propertyName}Facade.state,
        result: this.${propertyName}Facade.result,
        error: this.${propertyName}Facade.error,
        submit: (
            input: Parameters<${facadeAlias}['submit']>[0]
        ): ReturnType<${facadeAlias}['submit']> =>
            ${submit},
    };`;
        })
        .join('\n');
    const rxjsImport =
        orchestratedCommandDescriptors.length > 0
            ? "import { tap } from 'rxjs';\n"
            : '';
    return `import { Service, inject } from '@angular/core';
${rxjsImport}${imports}

@Service({ autoProvided: false })
export class PageComposition {
${queryProperties}
${directCommandProperties}
${commandFacades}
${commandProperties}
}
`;
}

function renderProviders(descriptors) {
    const imports = descriptors
        .flatMap(
            ({ facadeName, facadeAlias, sourceName, sourceAlias, node }) => [
                `import { ${facadeName} as ${facadeAlias} } from './nodes/${node.id}/${node.primitive_ref.operation_id}.facade';`,
                `import { ${sourceName} as ${sourceAlias} } from './nodes/${node.id}/${node.primitive_ref.operation_id}.source';`,
            ]
        )
        .join('\n');
    const providers = descriptors
        .flatMap(({ facadeAlias, sourceAlias }) => [sourceAlias, facadeAlias])
        .map((name) => `    ${name},`)
        .join('\n');
    return `import type { Provider } from '@angular/core';
${imports}

import { PageComposition } from './page-composition';

export const PAGE_COMPOSITION_PROVIDERS: readonly Provider[] = [
${providers}
    PageComposition,
];
`;
}

function renderPublicApi(descriptors) {
    const namespaces = descriptors
        .map(
            ({ node }) =>
                `export * as ${pascalCase(node.id)}Node from './nodes/${node.id}/index';`
        )
        .join('\n');
    return `export * from './page-composition';
export * from './page-composition.providers';
${namespaces}
`;
}

export function renderAngularPageComposition(plan, renderedNodes) {
    const expected = [
        ...plan.query_nodes.map((node) => ({ kind: 'query', node })),
        ...plan.command_nodes.map((node) => ({ kind: 'command', node })),
    ].sort((left, right) => left.node.id.localeCompare(right.node.id));
    const byId = new Map();
    for (const rendered of renderedNodes) {
        if (byId.has(rendered.nodeId)) {
            fail(`duplicate rendered node ${rendered.nodeId}`);
        }
        byId.set(rendered.nodeId, rendered);
    }
    if (byId.size !== expected.length) {
        fail('rendered nodes must cover the plan exactly');
    }
    const descriptors = expected.map(({ kind, node }) => {
        const rendered = byId.get(node.id);
        if (!rendered || rendered.kind !== kind) {
            fail(`${node.id} has no matching ${kind} target`);
        }
        return nodeDescriptor(kind, node, rendered.target);
    });
    const files = {};
    const bindings = {};
    for (const { root, target } of descriptors) {
        const artifactByPath = new Map(
            target.artifacts.map(({ path, artifact_id: artifactId }) => [
                path,
                artifactId,
            ])
        );
        for (const [path, content] of Object.entries(target.files)) {
            if (!path.startsWith('src/')) fail(`${path} is outside src`);
            const outputPath = `${root}/${path.slice(4)}`;
            if (files[outputPath]) fail(`output collision at ${outputPath}`);
            const artifactId = artifactByPath.get(path);
            if (!artifactId) fail(`${path} has no primitive artifact binding`);
            files[outputPath] = content;
            bindings[outputPath] = artifactId;
        }
    }
    files['src/page-composition.ts'] = renderComposition(descriptors);
    bindings['src/page-composition.ts'] = 'execution-controller';
    files['src/page-composition.providers.ts'] = renderProviders(descriptors);
    bindings['src/page-composition.providers.ts'] = 'runtime-binding';
    files['src/index.ts'] = renderPublicApi(descriptors);
    bindings['src/index.ts'] = 'public-api';
    return { files, bindings };
}
