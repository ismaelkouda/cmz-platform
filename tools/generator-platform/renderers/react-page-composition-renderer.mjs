import { PAGE_COMPOSITION_CAPABILITIES } from './page-composition-renderer-shared.mjs';
import { camelCase, pascalCase } from './shared.mjs';

export const REACT_PAGE_COMPOSITION_CAPABILITIES =
    PAGE_COMPOSITION_CAPABILITIES;

function fail(message) {
    throw new Error(`react page composition renderer: ${message}`);
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
    const nodeName = pascalCase(node.id);
    return {
        kind,
        node,
        target,
        bindingName: `${operationName}Binding`,
        bindingAlias: `${nodeName}NodeBinding`,
        clientName: `${operationName}Client`,
        clientAlias: `${nodeName}NodeClient`,
        factoryName: `create${operationName}Hooks`,
        factoryAlias: `create${nodeName}NodeHooks`,
        hookName: `use${operationName}`,
        propertyName: camelCase(node.id),
        root: `src/nodes/${node.id}`,
    };
}

function renderBindingImports(descriptors) {
    return descriptors
        .map(
            ({ bindingName, bindingAlias, node }) =>
                `import type { ${bindingName} as ${bindingAlias} } from './nodes/${node.id}/use-${node.primitive_ref.operation_id}';`
        )
        .join('\n');
}

function renderRuntimeImports(descriptors) {
    return descriptors
        .map(
            ({
                bindingName,
                bindingAlias,
                clientName,
                clientAlias,
                factoryName,
                factoryAlias,
                kind,
                node,
            }) => {
                const bindingImport =
                    kind === 'command'
                        ? `    type ${bindingName} as ${bindingAlias},\n`
                        : '';
                return `import type { ${clientName} as ${clientAlias} } from './nodes/${node.id}/${node.primitive_ref.operation_id}.client';
import {
${bindingImport}
    ${factoryName} as ${factoryAlias},
} from './nodes/${node.id}/use-${node.primitive_ref.operation_id}';`;
            }
        )
        .join('\n');
}

function renderDependencies(descriptors) {
    return descriptors
        .map(
            ({ clientAlias, propertyName }) =>
                `    readonly ${propertyName}Client: ${clientAlias};`
        )
        .join('\n');
}

function renderCompositionBinding(descriptors) {
    return descriptors
        .map(({ bindingAlias, kind, node, propertyName }) => {
            if (kind === 'query') {
                return `    readonly ${propertyName}: ${bindingAlias};`;
            }
            return `    readonly ${propertyName}: Omit<${bindingAlias}, 'submit'> & {
        readonly authorized: boolean;
        readonly deniedBehavior: ${JSON.stringify(node.authorization.denied_behavior ?? null)};
        readonly submit: ${bindingAlias}['submit'];
    };`;
        })
        .join('\n');
}

function renderFactories(descriptors) {
    return descriptors
        .map(
            ({ factoryAlias, propertyName }) =>
                `    const ${propertyName}NodeHooks = ${factoryAlias}(
        hooks,
        dependencies.${propertyName}Client
    );`
        )
        .join('\n');
}

function renderHookBindings(descriptors) {
    return descriptors
        .map(
            ({ hookName, propertyName }) =>
                `        const ${propertyName}Node = ${propertyName}NodeHooks.${hookName}();`
        )
        .join('\n');
}

function renderCommandBindings(descriptors) {
    const queryById = new Map(
        descriptors
            .filter(({ kind }) => kind === 'query')
            .map((descriptor) => [descriptor.node.id, descriptor])
    );
    return descriptors
        .filter(({ kind }) => kind === 'command')
        .map(({ bindingAlias, node, propertyName }) => {
            const permissions = node.authorization.permissions ?? [];
            const authorized =
                node.authorization.mode === 'none'
                    ? 'true'
                    : `${JSON.stringify(permissions)}.every((permission) =>
            grantedPermissions.has(permission)
        )`;
            const missing =
                node.authorization.mode === 'none'
                    ? '[]'
                    : `${JSON.stringify(permissions)}.filter(
                (permission) => !grantedPermissions.has(permission)
            )`;
            const invalidations = node.invalidates.map((targetId) => {
                const target = queryById.get(targetId);
                if (!target) {
                    fail(
                        `${node.id} invalidates missing query node ${targetId}`
                    );
                }
                return `                void ${target.propertyName}Node.reload().catch(() => undefined);`;
            });
            const postSuccess =
                invalidations.length === 0
                    ? ''
                    : `.then((result) => {
${invalidations.join('\n')}
                return result;
            })`;
            const dependencies = [
                'grantedPermissions',
                `${propertyName}Node.submit`,
                ...node.invalidates.map(
                    (targetId) =>
                        `${queryById.get(targetId).propertyName}Node.reload`
                ),
            ].join(', ');
            return `        const ${propertyName}Authorized = ${authorized};
        const submit${pascalCase(node.id)} = hooks.useCallback(
            (
                input: Parameters<${bindingAlias}['submit']>[0]
            ): ReturnType<${bindingAlias}['submit']> => {
                const missingPermissions: readonly string[] = ${missing};
                if (missingPermissions.length > 0) {
                    return Promise.reject(
                        new PageActionPermissionDeniedError(missingPermissions)
                    );
                }
                return ${propertyName}Node.submit(input)${postSuccess};
            },
            [${dependencies}]
        );`;
        })
        .join('\n');
}

function renderReturn(descriptors) {
    return descriptors
        .map(({ kind, node, propertyName }) => {
            if (kind === 'query')
                return `            ${propertyName}: ${propertyName}Node,`;
            return `            ${propertyName}: {
                ...${propertyName}Node,
                authorized: ${propertyName}Authorized,
                deniedBehavior: ${JSON.stringify(node.authorization.denied_behavior ?? null)},
                submit: submit${pascalCase(node.id)},
            },`;
        })
        .join('\n');
}

function renderComposition(descriptors) {
    return `${renderBindingImports(descriptors)}

export interface PageCompositionBinding {
${renderCompositionBinding(descriptors)}
}

export class PageActionPermissionDeniedError extends Error {
    readonly code = 'permission_denied';
    readonly missingPermissions: readonly string[];

    constructor(missingPermissions: readonly string[]) {
        super(\`Missing required permissions: \${missingPermissions.join(', ')}\`);
        this.name = 'PageActionPermissionDeniedError';
        this.missingPermissions = Object.freeze([...missingPermissions]);
    }
}
`;
}

function renderRuntime(descriptors) {
    const firstFactory = descriptors[0]?.factoryAlias;
    if (!firstFactory) fail('the page plan must contain at least one node');
    return `${renderRuntimeImports(descriptors)}

import {
    PageActionPermissionDeniedError,
    type PageCompositionBinding,
} from './page-composition';

export type ReactHooksPort = Parameters<typeof ${firstFactory}>[0];

export interface PageCompositionDependencies {
${renderDependencies(descriptors)}
}

export function createPageCompositionHooks(
    hooks: ReactHooksPort,
    dependencies: PageCompositionDependencies
) {
${renderFactories(descriptors)}

    function usePageComposition(
        grantedPermissions: ReadonlySet<string>
    ): PageCompositionBinding {
${renderHookBindings(descriptors)}
${renderCommandBindings(descriptors)}

        return {
${renderReturn(descriptors)}
        };
    }

    return { usePageComposition };
}
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
export * from './page-composition.runtime';
${namespaces}
`;
}

export function renderReactPageComposition(plan, renderedNodes) {
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
    files['src/page-composition.runtime.ts'] = renderRuntime(descriptors);
    bindings['src/page-composition.runtime.ts'] = 'runtime-binding';
    files['src/index.ts'] = renderPublicApi(descriptors);
    bindings['src/index.ts'] = 'public-api';
    return { files, bindings };
}
