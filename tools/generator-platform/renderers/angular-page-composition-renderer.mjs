import {
    requiredPermissions,
    sessionEffects,
} from './page-composition-guards.mjs';
import { camelCase, pascalCase } from './shared.mjs';
import { ANGULAR_SESSION_PAGE_CAPABILITIES } from './page-composition-renderer-shared.mjs';
import { externalQueryMember } from './angular-page-composition-query-members.mjs';
import { renderCompositionQuerySpec } from './angular-page-composition-query-spec.mjs';
import {
    ABSENT_TEXT_ROOT,
    COMMAND_MEMBER_KINDS,
    externalCompositionApi,
    nodeMembers,
    renderAbsentTextRoot,
    renderCompositionApiAssertion,
    renderCompositionContractSpec,
} from './angular-page-composition-api.mjs';

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

// `external` (X3, produit extérieur) : primitive déjà publiée hors de la
// composition. Ses fichiers sont matérialisés à `root` pour le contrôle des
// artefacts, et la composition l'importe depuis `module`.
function nodeDescriptor(kind, node, target, external) {
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
        root: external?.root ?? `src/nodes/${node.id}`,
        module: external?.module ?? `./nodes/${node.id}`,
        // Profil extérieur seulement : entrée d'exemple et jeton d'adresse de
        // la spec de contrat (P-A3).
        sampleInput: external?.sampleInput,
        serviceToken: external?.serviceToken,
        // X5 C4 : la façade de lecture attend une entrée typée.
        queryInput: external?.queryInput === true,
        responseSample: external?.responseSample,
    };
}

function renderComposition(descriptors, plan, hostBindings) {
    const sessionMode = plan.schema_version === '1.1.0';
    const effects = new Map(
        sessionEffects(plan).map((effect) => [effect.node_id, effect])
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
            ({ facadeName, facadeAlias, node, module }) =>
                `import { ${facadeName} as ${facadeAlias} } from '${module}/${node.primitive_ref.operation_id}.facade';`
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
            if (node.authorization.mode === 'none') {
                return `    private readonly ${propertyName}Authorized = computed(() => true);`;
            }
            const permissions = requiredPermissions(node);
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

// X4-sécurité-3, O-A : composition du profil extérieur (liaison de
// connectivité présente). Chaque membre publié est rendu depuis la table `api`
// (G-A1) ; toute commande est une flèche dont le corps est un seul `defer`
// (G-A2) ; tout signal est un `computed` (G-A3) ; les imports sont fermés
// (G-A4) ; la seule navigation prend la destination rendue par la session
// (G-A6). Le profil interne ne passe jamais ici.
const EXTERNAL_IMPORTS = Object.freeze({
    '@angular/core': [
        'DestroyRef',
        'InjectionToken',
        'Service',
        'computed',
        'effect',
        'inject',
        'signal',
        'type Signal',
    ],
    '@angular/router': ['Router'],
    rxjs: [
        'catchError',
        'defer',
        'map',
        // X5 C4 : `of` termine une commande froide de lecture.
        'of',
        'tap',
        'throwError',
        'type Observable',
    ],
});
const CONNECTIVITY_TOKEN = 'ApplicationConnectivity';
const NAVIGATION =
    'void this.router.navigateByUrl(destination, { replaceUrl: true });';

function assertExternalImports(source, descriptors, hostBindings) {
    const allowedModules = new Map(
        Object.entries(EXTERNAL_IMPORTS).map(([module, names]) => [
            module,
            new Set(names),
        ])
    );
    allowedModules.set(
        hostBindings.session.module,
        new Set([hostBindings.session.token])
    );
    allowedModules.set(
        hostBindings.connectivity.module,
        new Set([CONNECTIVITY_TOKEN])
    );
    for (const { facadeName, facadeAlias, node, module } of descriptors)
        allowedModules.set(
            `${module}/${node.primitive_ref.operation_id}.facade`,
            new Set([`${facadeName} as ${facadeAlias}`])
        );
    const imports = [
        ...source.matchAll(/^import \{ ([^}]+) \} from '([^']+)';$/gm),
    ];
    // repli justifié : String.match rend null sans correspondance : aucune instruction import.
    const statements = source.match(/^import\b.*$/gm) ?? [];
    if (statements.length !== imports.length)
        fail('external composition import outside the closed list');
    for (const [, names, module] of imports) {
        const allowed = allowedModules.get(module);
        if (!allowed) fail(`external composition imports ${module}`);
        for (const name of names.split(', '))
            if (!allowed.has(name))
                fail(`external composition imports ${name} from ${module}`);
    }
    const navigations = source.split('this.router.').length - 1;
    const bounded = source.split(NAVIGATION).length - 1;
    if (navigations !== bounded)
        fail('external composition navigates outside the session destination');
    if (
        /\b(?:window|document|location|navigator|localStorage|sessionStorage|globalThis)\b/.test(
            source
        )
    )
        fail('external composition names a browser global');
    if (/useDeprecatedSynchronousErrorHandling/.test(source))
        fail('external composition changes rxjs error handling');
}

function externalSubmit(descriptor, effect) {
    const { facadeAlias, propertyName, node } = descriptor;
    const invocation = `this.${propertyName}Facade.submit(input)`;
    const guarded =
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
    const body = `defer(() => {
                const epoch = this.session.epoch();
${effect ? `                this.${propertyName}SessionError.set(undefined);\n` : ''}                return ${guarded}.pipe(tap((result) => {
                    if (this.session.epoch() !== epoch) throw new Error('PAGE_SESSION_CHANGED');
${effect ? `                    const canonical: Record<string, unknown> = Object.create(null);\n${canonical}\n                    const destination = ${transition};\n                    ${NAVIGATION}` : '                    void result;'}
                })${
                    effect
                        ? `, map(() => undefined), catchError(() => {
                    if (this.${propertyName}Facade.state() === 'success') this.${propertyName}SessionError.set(Object.freeze({ kind: 'invalid-response', status: 200, message: 'La session ne peut pas être établie.', fields: Object.freeze({}) }));
                    return throwError(() => new Error('PAGE_SESSION_ACTION_FAILED'));
                })`
                        : ''
                });
            })`;
    if (!body.startsWith('defer(() => {'))
        fail(`${node.id} command is not a single leading defer`);
    return `(
            input: Parameters<${facadeAlias}['submit']>[0]
        ): ${effect ? 'Observable<void>' : `ReturnType<${facadeAlias}['submit']>`} =>
            ${body}`;
}

// Patron fermé : membre → expression, par genre de la table.
function externalMember(descriptor, effect, member, kind) {
    const name = descriptor.propertyName;
    const patterns = {
        state: effect
            ? `computed(() => this.${name}SessionError() ? 'error' : this.${name}Facade.state())`
            : `computed(() => this.${name}Facade.state())`,
        result: effect
            ? 'computed(() => undefined)'
            : `computed(() => this.${name}Facade.result())`,
        error: effect
            ? `computed(() => this.${name}SessionError() ?? this.${name}Facade.error())`
            : `computed(() => this.${name}Facade.error())`,
        fieldErrors: `computed<Readonly<Record<string, readonly string[]>>>(() => this.${name}Facade.error()?.fields ?? Object.freeze({}))`,
        authorized: `computed(() => this.${name}Authorized())`,
        deniedBehavior: JSON.stringify(
            descriptor.node.authorization.denied_behavior ?? null
        ),
        submit: externalSubmit(descriptor, effect),
    };
    if (
        !Object.hasOwn(patterns, member) ||
        COMMAND_MEMBER_KINDS[member] !== kind
    )
        fail(`${descriptor.node.id}.${member} is outside the closed pattern`);
    const expression = patterns[member];
    if (kind === 'signal' && !expression.startsWith('computed'))
        fail(`${descriptor.node.id}.${member} is not a read-only signal`);
    return `        ${member}: ${expression},`;
}

function renderExternalComposition(descriptors, plan, hostBindings) {
    if (descriptors.some(({ kind }) => !['command', 'query'].includes(kind)))
        fail('external composition publishes command and query nodes only');
    const commands = descriptors.filter(({ kind }) => kind === 'command');
    const queries = descriptors.filter(({ kind }) => kind === 'query');
    if (
        hostBindings.connectivity?.token !== CONNECTIVITY_TOKEN ||
        !/^(?:\.\/|(?:\.\.\/){1,8})[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(
            hostBindings.connectivity?.module ?? ''
        )
    )
        fail('PAGE_CONNECTIVITY_HOST_BINDING');
    const api = externalCompositionApi(plan);
    const effects = new Map(
        sessionEffects(plan).map((effect) => [effect.node_id, effect])
    );
    const byName = new Map(
        descriptors.map((descriptor) => [descriptor.propertyName, descriptor])
    );
    const roots = [...new Set(api.map((entry) => entry.path.split('.')[0]))];
    const authorized = commands.filter(
        ({ node }) => node.authorization.mode === 'required'
    );
    const hasAuthorization = authorized.length > 0;
    const facades = descriptors
        .map(
            ({ facadeAlias, propertyName }) =>
                `    private readonly ${propertyName}Facade = inject(${facadeAlias});`
        )
        .join('\n');
    const sessionErrors = commands
        .filter(({ node }) => effects.has(node.id))
        .map(
            ({ propertyName }) =>
                `    private readonly ${propertyName}SessionError = signal<{ readonly kind: 'invalid-response'; readonly status: number; readonly message: string; readonly fields: Readonly<Record<string, readonly string[]>> } | undefined>(undefined);`
        )
        .join('\n');
    const authorization = commands
        .map(({ propertyName, node }) =>
            node.authorization.mode === 'none'
                ? `    private readonly ${propertyName}Authorized = computed(() => true);`
                : `    private readonly ${propertyName}PermissionSignals = ${JSON.stringify(requiredPermissions(node))}.map((permission) =>
        this.permissionPort.has(permission)
    );
    private readonly ${propertyName}Authorized = computed(() =>
        this.${propertyName}PermissionSignals.every((permission) => permission())
    );`
        )
        .join('\n');
    const members = roots
        .map((root) => {
            if (root === 'online')
                return '    readonly online = computed(() => this.connectivity.online());';
            // X5 C5 (B+, C-B+1) : racine sans nœud, patron fermé.
            if (root === ABSENT_TEXT_ROOT)
                return renderAbsentTextRoot(api, plan);
            const descriptor = byName.get(root);
            if (!descriptor) fail(`api member ${root} has no node`);
            const effect = effects.get(descriptor.node.id);
            const render = ({ member, kind }) =>
                descriptor.kind === 'query'
                    ? externalQueryMember(
                          descriptor,
                          member,
                          kind,
                          descriptor.queryInput
                      )
                    : externalMember(descriptor, effect, member, kind);
            return `    readonly ${root} = Object.freeze({
${nodeMembers(api, root).map(render).join('\n')}
    });`;
        })
        .join('\n');
    const coreImports = [
        'DestroyRef',
        ...(hasAuthorization ? ['InjectionToken'] : []),
        'Service',
        'computed',
        'effect',
        'inject',
        ...(effects.size ? ['signal'] : []),
        ...(hasAuthorization ? ['type Signal'] : []),
    ];
    const rxjsImports = [
        ...(effects.size ? ['catchError'] : []),
        'defer',
        ...(effects.size ? ['map'] : []),
        ...(queries.length ? ['of'] : []),
        ...(commands.length ? ['tap'] : []),
        ...(effects.size ? ['throwError'] : []),
        ...(effects.size || queries.length ? ['type Observable'] : []),
    ];
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
    const resets = [
        ...commands.map(
            ({ propertyName }) =>
                `            this.${propertyName}Facade.reset();`
        ),
        ...commands
            .filter(({ node }) => effects.has(node.id))
            .map(
                ({ propertyName }) =>
                    `            this.${propertyName}SessionError.set(undefined);`
            ),
    ].join('\n');
    // X5 C4 (décision du pilote) : un nœud de lecture \`page-enter\` est lu une
    // fois à la construction de la composition, par sa façade (G3 : adresse
    // résolue dans le defer de la source). \`load\` et \`reload\` restent froids.
    // L'entrée vient des liaisons du plan ; une liaison n'est pas encore
    // supportée en extérieur (aucune valeur n'est inventée).
    const initialReads = queries
        .filter(({ node }) => node.trigger === 'page-enter')
        .map(({ node, propertyName, queryInput }) => {
            if (node.input_bindings.length > 0)
                fail(
                    `${node.id} initial read with input bindings is not supported in the external composition`
                );
            return `\n        this.${propertyName}Facade.load(${queryInput ? '{}' : ''});`;
        })
        .join('');
    const source = `import { ${coreImports.join(', ')} } from '@angular/core';
${effects.size ? "import { Router } from '@angular/router';\n" : ''}import { ${hostBindings.session.token} } from '${hostBindings.session.module}';
import { ${CONNECTIVITY_TOKEN} } from '${hostBindings.connectivity.module}';
import { ${rxjsImports.join(', ')} } from 'rxjs';
${descriptors
    .map(
        ({ facadeName, facadeAlias, node, module }) =>
            `import { ${facadeName} as ${facadeAlias} } from '${module}/${node.primitive_ref.operation_id}.facade';`
    )
    .join('\n')}
${permissionContract}
@Service({ autoProvided: false })
export class PageComposition {
${hasAuthorization ? '    private readonly permissionPort = inject(PAGE_ACTION_PERMISSION_PORT);\n' : ''}    private readonly connectivity = inject(${CONNECTIVITY_TOKEN});
    private readonly session = inject(${hostBindings.session.token});
${effects.size ? '    private readonly router = inject(Router);\n' : ''}${facades}
${sessionErrors}${sessionErrors ? '\n' : ''}${authorization}

    constructor() {
        let previous = this.session.epoch();
        const reset = (): void => {
${resets}
        };
        effect(() => { const epoch = this.session.epoch(); if (epoch !== previous) { previous = epoch; reset(); } });
        inject(DestroyRef).onDestroy(reset);${initialReads}
    }

${members}
}
`;
    assertExternalImports(source, descriptors, hostBindings);
    return { source, api };
}

function renderProviders(descriptors) {
    const imports = descriptors
        .flatMap(
            ({
                facadeName,
                facadeAlias,
                sourceName,
                sourceAlias,
                node,
                module,
            }) => [
                `import { ${facadeName} as ${facadeAlias} } from '${module}/${node.primitive_ref.operation_id}.facade';`,
                `import { ${sourceName} as ${sourceAlias} } from '${module}/${node.primitive_ref.operation_id}.source';`,
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
            ({ node, module }) =>
                `export * as ${pascalCase(node.id)}Node from '${module}/index';`
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
    hostBindings,
    { externalNodes = {} } = {}
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
        return nodeDescriptor(
            kind,
            node,
            rendered.target,
            Object.hasOwn(externalNodes, node.id)
                ? externalNodes[node.id]
                : undefined
        );
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
    // Verrou de profil : seule la composition extérieure reçoit la liaison de
    // connectivité (core/external-page-composition.mjs). Le profil interne
    // garde le rendu historique, identique à l'octet.
    if (plan.schema_version === '1.1.0' && hostBindings?.connectivity) {
        const external = renderExternalComposition(
            descriptors,
            plan,
            hostBindings
        );
        files['src/page-composition.ts'] = external.source;
        files['src/page-composition.api.ts'] = renderCompositionApiAssertion(
            external.api
        );
        bindings['src/page-composition.api.ts'] = 'execution-controller';
        const effects = new Set(
            sessionEffects(plan).map((effect) => effect.node_id)
        );
        // X5 C4 : la spec des commandes n'existe que pour une page à commandes
        // (une liste vide ne se type pas) ; une page de lectures seules garde
        // ses contrôles généraux dans la spec des lectures.
        const commandDescriptors = descriptors.filter(
            ({ kind }) => kind === 'command'
        );
        if (commandDescriptors.length > 0) {
            files['src/page-composition.contract.spec.ts'] =
                renderCompositionContractSpec(
                    commandDescriptors.map((descriptor) => ({
                        ...descriptor,
                        effect: effects.has(descriptor.node.id),
                    })),
                    hostBindings
                );
            bindings['src/page-composition.contract.spec.ts'] =
                'execution-controller';
        }
        // X5 C4 : contrat des lectures, seulement pour une page à lectures.
        if (descriptors.some(({ kind }) => kind === 'query')) {
            files['src/page-composition.queries.spec.ts'] =
                renderCompositionQuerySpec(descriptors, hostBindings);
            bindings['src/page-composition.queries.spec.ts'] =
                'execution-controller';
        }
    } else
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
