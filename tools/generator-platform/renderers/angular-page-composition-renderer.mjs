import { camelCase, pascalCase } from './shared.mjs';
import { ANGULAR_SESSION_PAGE_CAPABILITIES } from './page-composition-renderer-shared.mjs';

export const ANGULAR_PAGE_COMPOSITION_CAPABILITIES =
    ANGULAR_SESSION_PAGE_CAPABILITIES;

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

function renderComposition(descriptors, plan, hostBindings) {
    const sessionMode = plan.schema_version === '1.1.0';
    const effects = new Map(
        (plan.session?.effects ?? []).map((effect) => [effect.node_id, effect])
    );
    const sessionBinding = hostBindings?.session;
    if (
        sessionMode &&
        (hostBindings?.schema_version !== '1.1.0' ||
            sessionBinding?.token !== 'APPLICATION_SESSION' ||
            typeof sessionBinding.module !== 'string' ||
            !/^(?:[@A-Za-z0-9][@A-Za-z0-9._/-]*|(?:\.\/|(?:\.\.\/){1,8})[A-Za-z0-9][A-Za-z0-9._/-]*)$/.test(
                sessionBinding.module
            ))
    )
        fail('PAGE_SESSION_HOST_BINDING');
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
    const hasSessionCommands = sessionMode && commandDescriptors.length > 0;
    const authorizedCommandDescriptors = commandDescriptors.filter(
        ({ node }) => node.authorization.mode === 'required'
    );
    const queryProperties = queryDescriptors
        .map(
            ({ facadeAlias, propertyName }) =>
                `    readonly ${propertyName} = inject(${facadeAlias});`
        )
        .join('\n');
    const commandFacades = commandDescriptors
        .map(
            ({ facadeAlias, propertyName }) =>
                `    private readonly ${propertyName}Facade = inject(${facadeAlias});`
        )
        .join('\n');
    const authorizationSignals = commandDescriptors
        .map(({ propertyName, node }) => {
            const permissions = node.authorization.permissions ?? [];
            if (node.authorization.mode === 'none') {
                return `    private readonly ${propertyName}Authorized = computed(() => true);`;
            }
            return `    private readonly ${propertyName}PermissionSignals = ${JSON.stringify(permissions)}.map((permission) =>
        this.permissionPort.has(permission)
    );
    private readonly ${propertyName}Authorized = computed(() =>
        this.${propertyName}PermissionSignals.every((permission) => permission())
    );`;
        })
        .join('\n');
    const descriptorById = new Map(
        queryDescriptors.map((descriptor) => [descriptor.node.id, descriptor])
    );
    const commandProperties = commandDescriptors
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
            const guardedInvocation =
                node.authorization.mode === 'required'
                    ? `defer(() => {
                const permissions = ${JSON.stringify(node.authorization.permissions)};
                const missingPermissions = permissions.filter(
                    (_permission, index) =>
                        !this.${propertyName}PermissionSignals[index]()
                );
                if (missingPermissions.length > 0) {
                    throw new PageActionPermissionDeniedError(missingPermissions);
                }
                return ${invocation};
            })`
                    : invocation;
            let submit =
                invalidationStatements.length === 0
                    ? guardedInvocation
                    : `${guardedInvocation}.pipe(\n                tap(() => {\n${invalidationStatements.join('\n')}\n                })\n            )`;
            const effect = effects.get(node.id);
            if (sessionMode) {
                const canonical = effect
                    ? effect.canonical_fields
                          .map(
                              (field) =>
                                  `                    if (result[${JSON.stringify(field.name)}] !== undefined) Object.defineProperty(canonical, ${JSON.stringify(field.source_field)}, { value: result[${JSON.stringify(field.name)}], enumerable: true });`
                          )
                          .join('\n')
                    : '';
                const transition = effect
                    ? effect.kind === 'establish'
                        ? `this.session.establish(${JSON.stringify(effect.producer)}, canonical, epoch)`
                        : `this.session.complete(${JSON.stringify(effect.stage_id)}, ${JSON.stringify(effect.producer)}, canonical, epoch)`
                    : '';
                submit = `defer(() => {
                const epoch = this.session.epoch();
${effect ? `                this.${propertyName}SessionError.set(undefined);\n` : ''}
                return ${submit}.pipe(tap((result) => {
                    if (this.session.epoch() !== epoch) throw new Error('PAGE_SESSION_CHANGED');
${effect ? `                    const canonical: Record<string, unknown> = Object.create(null);\n${canonical}\n                    const destination = ${transition};\n                    void this.router.navigateByUrl(destination, { replaceUrl: true });` : '                    void result;'}
                })${
                    effect
                        ? `, map(() => undefined), catchError(() => {
                    if (this.${propertyName}Facade.state() === 'success') this.${propertyName}SessionError.set(Object.freeze({ kind: 'invalid-response', status: 200, message: 'La session ne peut pas être établie.', fields: Object.freeze({}) }));
                    return throwError(() => new Error('PAGE_SESSION_ACTION_FAILED'));
                })`
                        : ''
                });
            })`;
            }
            return `    readonly ${propertyName} = {
        state: ${effect ? `computed(() => this.${propertyName}SessionError() ? 'error' : this.${propertyName}Facade.state())` : `this.${propertyName}Facade.state`},
        result: ${effect ? 'computed(() => undefined)' : `this.${propertyName}Facade.result`},
        error: ${effect ? `computed(() => this.${propertyName}SessionError() ?? this.${propertyName}Facade.error())` : `this.${propertyName}Facade.error`},
${node.primitive_ref.schema_version === '1.1.0' ? `        fieldErrors: computed<Readonly<Record<string, readonly string[]>>>(() => this.${propertyName}Facade.error()?.fields ?? Object.freeze({})),\n` : ''}        authorized: this.${propertyName}Authorized,
        deniedBehavior: ${JSON.stringify(node.authorization.denied_behavior ?? null)},
        submit: (
            input: Parameters<${facadeAlias}['submit']>[0]
        ): ${effect ? 'Observable<void>' : `ReturnType<${facadeAlias}['submit']>`} =>
            ${submit},
    };`;
        })
        .join('\n');
    const hasAuthorization = authorizedCommandDescriptors.length > 0;
    const angularImports = [
        ...(hasAuthorization ? ['InjectionToken'] : []),
        'Service',
        ...(!sessionMode || commandDescriptors.length ? ['computed'] : []),
        'inject',
        ...(hasAuthorization ? ['type Signal'] : []),
        ...(hasSessionCommands ? ['DestroyRef', 'effect'] : []),
        ...(effects.size ? ['signal'] : []),
    ].join(', ');
    const rxjsImports = [
        ...(hasAuthorization || hasSessionCommands ? ['defer'] : []),
        ...(hasSessionCommands ||
        commandDescriptors.some(({ node }) => node.invalidates.length > 0)
            ? ['tap']
            : []),
        ...(effects.size
            ? ['map', 'catchError', 'throwError', 'type Observable']
            : []),
    ];
    const rxjsImport =
        rxjsImports.length > 0
            ? `import { ${rxjsImports.join(', ')} } from 'rxjs';\n`
            : '';
    const permissionContract = hasAuthorization
        ? `
export interface PageActionPermissionPort {
    has(permission: string): Signal<boolean>;
}

export const PAGE_ACTION_PERMISSION_PORT =
    new InjectionToken<PageActionPermissionPort>('PAGE_ACTION_PERMISSION_PORT');

export class PageActionPermissionDeniedError extends Error {
    readonly code = 'permission_denied';
    readonly missingPermissions: readonly string[];

    constructor(missingPermissions: readonly string[]) {
        super(\`Missing required permissions: \${missingPermissions.join(', ')}\`);
        this.name = 'PageActionPermissionDeniedError';
        this.missingPermissions = Object.freeze([...missingPermissions]);
    }
}
`
        : '';
    const permissionInjection = hasAuthorization
        ? '    private readonly permissionPort = inject(PAGE_ACTION_PERMISSION_PORT);\n'
        : '';
    const sessionSetup = hasSessionCommands
        ? `    private readonly session = inject(${sessionBinding.token});
${effects.size ? '    private readonly router = inject(Router);\n' : ''}
    constructor() {
        let previous = this.session.epoch();
        const reset = (): void => {
${commandDescriptors
    .filter(({ node }) => node.primitive_ref.schema_version === '1.1.0')
    .map(
        ({ propertyName }) => `            this.${propertyName}Facade.reset();`
    )
    .join('\n')}
${commandDescriptors
    .filter(({ node }) => effects.has(node.id))
    .map(
        ({ propertyName }) =>
            `            this.${propertyName}SessionError.set(undefined);`
    )
    .join('\n')}
        };
        effect(() => { const epoch = this.session.epoch(); if (epoch !== previous) { previous = epoch; reset(); } });
        inject(DestroyRef).onDestroy(reset);
    }
`
        : '';
    return `import { ${angularImports} } from '@angular/core';
${hasSessionCommands ? `${effects.size ? "import { Router } from '@angular/router';\n" : ''}import { ${sessionBinding.token} } from '${sessionBinding.module}';\n` : ''}${rxjsImport}${imports}
${permissionContract}

@Service({ autoProvided: false })
export class PageComposition {
${permissionInjection}
${queryProperties}
${commandFacades}
${commandDescriptors
    .filter(({ node }) => effects.has(node.id))
    .map(
        ({ propertyName }) =>
            `    private readonly ${propertyName}SessionError = signal<{ readonly kind: 'invalid-response'; readonly status: number; readonly message: string; readonly fields: Readonly<Record<string, readonly string[]>> } | undefined>(undefined);`
    )
    .join(
        '\n'
    )}${effects.size ? '\n' : ''}${sessionSetup}${authorizationSignals}
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

export function renderAngularPageComposition(
    plan,
    renderedNodes,
    hostBindings
) {
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
    files['src/page-composition.ts'] = renderComposition(
        descriptors,
        plan,
        hostBindings
    );
    bindings['src/page-composition.ts'] = 'execution-controller';
    files['src/page-composition.providers.ts'] = renderProviders(descriptors);
    bindings['src/page-composition.providers.ts'] = 'runtime-binding';
    files['src/index.ts'] = renderPublicApi(descriptors);
    bindings['src/index.ts'] = 'public-api';
    return { files, bindings };
}
