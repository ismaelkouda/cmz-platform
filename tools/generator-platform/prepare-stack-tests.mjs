import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
    mkdir,
    readFile,
    readdir,
    rm,
    symlink,
    writeFile,
} from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { computeTargets } from './render-targets.mjs';
import {
    computeEvolvableCompositionTargets,
    directorContractPath,
} from './check-evolvable-composition.mjs';
import { computeWorkflowTargets } from './workflow-targets.mjs';
import {
    computeAngularListQueryV2Target,
    computeReactListQueryV2Target,
} from './list-query-v2-targets.mjs';
import {
    computeAngularActionRequestV2Target,
    computeReactActionRequestV2Target,
} from './action-request-v2-targets.mjs';
import { renderBehaviorGraphEngine } from './renderers/behavior-graph-renderer.mjs';
import {
    renderAngularBehaviorGraphService,
    renderReactBehaviorGraphHook,
} from './renderers/behavior-graph-stack-adapters.mjs';
import { renderPresentationFlowEngine } from './renderers/presentation-flow-renderer.mjs';
import {
    renderAngularPresentationFlowService,
    renderReactPresentationFlowHook,
} from './renderers/presentation-flow-stack-adapters.mjs';
import { loadJson } from './validate-ir.mjs';
import {
    createApplicationSessionFixture,
    SESSION_FIXTURE_DOMAINS,
} from './test-support/application-session-fixture.mjs';
import { renderAngularPwaShell } from './renderers/angular-pwa-shell-renderer.mjs';
import { renderAngularActionRequestV2 } from './renderers/angular-action-request-v2-renderer.mjs';
import { sessionEndpointToken } from './renderers/angular-application-session-renderer.mjs';
import { pascalCase } from './renderers/shared.mjs';
import { renderApplicationWorkspace } from './renderers/application-workspace-renderer.mjs';

const generatorRoot = dirname(fileURLToPath(import.meta.url));
const outputRoot = resolve(generatorRoot, '.stack-test-runtime');
const target = process.argv[2];

if (!['angular', 'reactjs'].includes(target)) {
    throw new Error(
        'Usage: node tools/generator-platform/prepare-stack-tests.mjs <angular|reactjs>'
    );
}

const computeListQueryV2Target =
    target === 'angular'
        ? computeAngularListQueryV2Target
        : computeReactListQueryV2Target;
const computeActionRequestV2Target =
    target === 'angular'
        ? computeAngularActionRequestV2Target
        : computeReactActionRequestV2Target;

async function writeTargetFiles(root, files) {
    for (const [relativePath, content] of Object.entries(files)) {
        const outputPath = resolve(root, relativePath);
        await mkdir(dirname(outputPath), { recursive: true });
        await writeFile(outputPath, content);
    }
}

async function runtimeFileHashes(root) {
    const entries = await readdir(root, {
        recursive: true,
        withFileTypes: true,
    });
    assert.ok(entries.every((entry) => !entry.isSymbolicLink()));
    const files = await Promise.all(
        entries
            .filter((entry) => entry.isFile())
            .map(async (entry) => {
                const path = resolve(entry.parentPath, entry.name);
                return [
                    relative(root, path).split(sep).join('/'),
                    createHash('sha256')
                        .update(await readFile(path))
                        .digest('hex'),
                ];
            })
    );
    return Object.fromEntries(
        files.sort(([left], [right]) => left.localeCompare(right))
    );
}

// These three unchanged specs exercise both complete session products. They
// are compiled by Angular's native test target, separately from the raw-TS
// Vitest runner used by the other stack fixtures.
const sessionSpecs = [
    'action-request-session.spec.ts',
    'application-session.spec.ts',
    'page-composition-session.spec.ts',
];

async function prepareSessionTestWorkspace() {
    const workspaceRoot = resolve(generatorRoot, '../..');
    const view = resolve(outputRoot, 'application-session-native');
    await rm(view, { recursive: true, force: true });
    const packageSource = await readFile(
        resolve(workspaceRoot, 'package.json')
    );
    const packageModel = JSON.parse(packageSource.toString('utf8'));
    const workspace = await renderApplicationWorkspace({
        profiles: ['angular-pwa'],
        packages: {},
        packageManager: packageModel.packageManager,
        engines: packageModel.engines,
        githubRepository: 'fixtures/session-stack-tests',
        reviewOwner: 'fixture-reviewer',
    });
    await writeTargetFiles(view, workspace);
    const copiedProducts = {};
    for (const domain of SESSION_FIXTURE_DOMAINS) {
        const product = resolve(
            outputRoot,
            'application-session-products',
            domain
        );
        const productHashes = await runtimeFileHashes(product);
        const files = {};
        for (const path of Object.keys(productHashes)) {
            files[path] = await readFile(resolve(product, path));
        }
        const nativeApp = resolve(view, 'apps', domain);
        await writeTargetFiles(nativeApp, files);
        assert.deepEqual(await runtimeFileHashes(nativeApp), productHashes);
        copiedProducts[domain] = productHashes;

        // Keep the specs and their relative imports byte-identical. These
        // runtime sources have already been compared with the full product.
        const runtime = resolve(
            outputRoot,
            'angular/application-session',
            domain
        );
        const runtimeHashes = await runtimeFileHashes(runtime);
        const runtimeFiles = {};
        for (const path of Object.keys(runtimeHashes)) {
            runtimeFiles[path] = await readFile(resolve(runtime, path));
        }
        const nativeRuntime = resolve(
            view,
            'tools/generator-platform/.stack-test-runtime/angular/application-session',
            domain
        );
        await writeTargetFiles(nativeRuntime, runtimeFiles);
        assert.deepEqual(await runtimeFileHashes(nativeRuntime), runtimeHashes);
    }
    const specRoot = 'tools/generator-platform/stack-tests/angular';
    const specHashes = {};
    for (const name of sessionSpecs) {
        const content = await readFile(resolve(workspaceRoot, specRoot, name));
        await writeTargetFiles(resolve(view, specRoot), { [name]: content });
        assert.deepEqual(
            await readFile(resolve(view, specRoot, name)),
            content
        );
        specHashes[name] = createHash('sha256').update(content).digest('hex');
    }
    assert.deepEqual(
        (await readdir(resolve(view, specRoot))).sort(),
        sessionSpecs
    );
    const projectPath = 'apps/observatory/project.json';
    const originalProject = await readFile(resolve(view, projectPath), 'utf8');
    const project = JSON.parse(originalProject);
    assert.equal(project.name, 'observatory');
    assert.equal(project.targets.test.executor, '@angular/build:unit-test');
    assert.equal(project.targets.test.options.watch, false);
    assert.equal(
        project.targets.test.options.runnerConfig,
        '.cmz/support/angular-unit-test.config.mjs'
    );
    const include = sessionSpecs.map((name) => resolve(view, specRoot, name));
    project.targets.test.options = {
        ...project.targets.test.options,
        include,
        tsConfig: 'session-tests.tsconfig.json',
        reporters: ['verbose'],
    };
    const overlay = JSON.stringify(project, null, 4) + '\n';
    await writeTargetFiles(view, {
        [projectPath]: overlay,
        'package.json': packageSource,
        'bun.lock': await readFile(resolve(workspaceRoot, 'bun.lock')),
        'session-tests.tsconfig.json':
            JSON.stringify(
                {
                    extends: './apps/observatory/tsconfig.spec.json',
                    files: sessionSpecs.map((name) => `${specRoot}/${name}`),
                    include: [],
                },
                null,
                4
            ) + '\n',
        'session-tests-provenance.json':
            JSON.stringify(
                {
                    fixtureOnly: true,
                    networkVerified: false,
                    nativeTarget: 'observatory:test',
                    bidomain: [...SESSION_FIXTURE_DOMAINS],
                    include,
                    specHashes,
                    copiedProducts,
                    projectOverlay: {
                        path: projectPath,
                        beforeSha256: createHash('sha256')
                            .update(originalProject)
                            .digest('hex'),
                        afterSha256: createHash('sha256')
                            .update(overlay)
                            .digest('hex'),
                        changedOptionsOnly: [
                            'include',
                            'tsConfig',
                            'reporters',
                        ],
                    },
                    testBedInitialization: 'Angular native builder only',
                    installs: false,
                },
                null,
                4
            ) + '\n',
    });
    // Reuse the acquired dependencies; this preparation never installs them.
    await symlink(
        resolve(workspaceRoot, 'node_modules'),
        resolve(view, 'node_modules'),
        'dir'
    );
}

// Fixture consumers mount the produced page composition in the produced
// shell. They are test applications, not generated business-page claims.
function sessionConsumers(data) {
    const imports = [
        "import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';",
        "import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';",
        "import type { Routes } from '@angular/router';",
        "import { appRoutes } from './src/app/app.routes';",
    ];
    const components = [],
        entries = [];
    for (const [id, { page, plan }] of data.pages) {
        if (!plan) continue;
        const name = pascalCase(page.path.slice(1)) + 'Consumer';
        const root = `./src/app/pages/${id}/execution`;
        imports.push(
            `import { PageComposition as ${name}Composition } from '${root}/page-composition';`
        );
        imports.push(
            `import { PAGE_COMPOSITION_PROVIDERS as ${name}Providers } from '${root}/page-composition.providers';`
        );
        const action = page.actions.find((entry) => entry.kind === 'backend');
        if (action) {
            const fields = data.actions.get(action.operation_ref.operation_id)
                .definition.operations[0].input.fields;
            const names = fields.map((field) => field.name);
            components.push(`@Component({ selector: 'app-fixture-${page.path.slice(1)}', changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ReactiveFormsModule], providers: [...${name}Providers],
    template: \`<h1>${page.path.slice(1)}</h1><form [formGroup]="form" (ngSubmit)="submit()">
        @for (field of fields; track field) { <label>{{ field }}<input [attr.name]="field" [formControl]="form.controls[field]" [attr.aria-describedby]="field + '-error'"></label>
            <p [id]="field + '-error'">@for (message of command.fieldErrors()[field] ?? []; track $index) { {{ message }} }</p> }
        <button type="submit" [disabled]="command.state() === 'submitting'">Envoyer</button>
        @if (command.error(); as error) { <p role="alert">{{ error.message }}</p> }
        <p role="status">{{ command.state() }}</p></form>\` })
export class ${name} {
    readonly command = inject(${name}Composition).${action.id};
    readonly fields: readonly string[] = ${JSON.stringify(names)};
    readonly form = new FormGroup<Record<string, FormControl<string>>>(Object.fromEntries(this.fields.map((name) => [name, new FormControl('', { nonNullable: true })])));
    readonly outcome = signal('idle');
    submit(): void { this.command.submit({ ${names.map((field) => `${JSON.stringify(field)}: this.form.controls[${JSON.stringify(field)}].value`).join(', ')} }).subscribe({ next: () => this.outcome.set('success'), error: () => this.outcome.set('error') }); }
}`);
        } else {
            const load = page.loads[0].id;
            components.push(`@Component({ selector: 'app-fixture-catalogue', changeDetection: ChangeDetectionStrategy.OnPush, providers: [...${name}Providers], template: \`<h1>Catalogue</h1><ul>@for (item of page.${load}.items(); track item.id) { <li>{{ item.label }}</li> }</ul>\` })
export class ${name} { readonly page = inject(${name}Composition); constructor() { this.page.${load}.load(); } }`);
        }
        entries.push(`${JSON.stringify(id)}: ${name}`);
    }
    return (
        imports.join('\n') +
        '\n' +
        components.join('\n') +
        `
const consumers = { ${entries.join(', ')} };
export const consumedRoutes: Routes = appRoutes.map((route) => {
    const id = route.data?.['page_id'];
    const consumer = typeof id === 'string' && Object.hasOwn(consumers, id) ? consumers[id as keyof typeof consumers] : undefined;
    return consumer ? { ...route, loadComponent: () => Promise.resolve(consumer) } : route;
});\n`
    );
}

const [
    actionRequest,
    authorizedActionRequest,
    workflowAction,
    contract,
    listQueryV2,
    publicListQueryV2,
    parameterizedListQueryV2,
    actionRequestV2,
    usersListQuery,
] = await Promise.all([
    computeTargets(),
    computeEvolvableCompositionTargets(),
    computeWorkflowTargets(),
    loadJson(directorContractPath),
    computeListQueryV2Target(),
    computeListQueryV2Target({
        definitionPath: resolve(
            generatorRoot,
            'fixtures/editorial-blocks.v2.definition.json'
        ),
    }),
    computeListQueryV2Target({
        definitionPath: resolve(
            generatorRoot,
            'fixtures/tasks-actions-processing-type.v2.definition.json'
        ),
    }),
    computeActionRequestV2Target(),
    computeListQueryV2Target({
        definitionPath: resolve(
            generatorRoot,
            'fixtures/users-list.v2.definition.json'
        ),
    }),
]);
const sourceKey = target === 'angular' ? 'angular' : 'react';
const targetRoot = resolve(outputRoot, target);
const [fixtureSupport, pageCompositionTargets] = await Promise.all([
    import('./page-composition.fixture.mjs'),
    import('./page-composition-targets.mjs'),
]);
const [fixture, usersFixture] = await Promise.all([
    fixtureSupport.createPageCompositionFixture(),
    fixtureSupport.createUsersPageCompositionFixture(),
]);
let pageComposition;
let usersPageComposition;
try {
    const computePageCompositionTarget =
        target === 'angular'
            ? (input) =>
                  pageCompositionTargets.computeAngularPageCompositionTarget({
                      ...input,
                      hostBindings: fixtureSupport.angularPageHostBindings,
                  })
            : (input) =>
                  pageCompositionTargets.computeReactPageCompositionTarget(
                      input
                  );
    [pageComposition, usersPageComposition] = await Promise.all([
        computePageCompositionTarget({
            plan: fixture.plan,
            artifactRoot: fixture.root,
        }),
        computePageCompositionTarget({
            plan: usersFixture.plan,
            artifactRoot: usersFixture.root,
        }),
    ]);
} finally {
    await Promise.all([
        rm(fixture.root, { recursive: true, force: true }),
        rm(usersFixture.root, { recursive: true, force: true }),
    ]);
}
const runtimeConfigurationFiles =
    target === 'angular'
        ? {
              'tsconfig.json': `${JSON.stringify(
                  {
                      extends: '../../../../tsconfig.base.json',
                      compilerOptions: {
                          emitDecoratorMetadata: true,
                          experimentalDecorators: true,
                      },
                      include: ['**/*.ts'],
                  },
                  null,
                  4
              )}\n`,
          }
        : {};

const behaviorGraphEngineSource = renderBehaviorGraphEngine(
    contract.evolution.behavior_graph
);
const behaviorGraphFiles =
    target === 'angular'
        ? {
              'behavior-graph-engine.ts': behaviorGraphEngineSource,
              'behavior-graph.service.ts': renderAngularBehaviorGraphService(),
          }
        : {
              'behavior-graph-engine.ts': behaviorGraphEngineSource,
              'use-behavior-graph.ts': renderReactBehaviorGraphHook(),
          };

const presentationFlowEngineSource = renderPresentationFlowEngine(
    contract.evolution.presentation
);
const presentationFlowFiles =
    target === 'angular'
        ? {
              'presentation-flow-engine.ts': presentationFlowEngineSource,
              'presentation-flow.service.ts':
                  renderAngularPresentationFlowService(),
          }
        : {
              'presentation-flow-engine.ts': presentationFlowEngineSource,
              'use-presentation-flow.ts': renderReactPresentationFlowHook(),
          };

await rm(targetRoot, { recursive: true, force: true });
await Promise.all([
    writeTargetFiles(targetRoot, runtimeConfigurationFiles),
    writeTargetFiles(
        resolve(targetRoot, 'action-request'),
        actionRequest[sourceKey].files
    ),
    writeTargetFiles(
        resolve(targetRoot, 'action-request-authorized'),
        authorizedActionRequest.targets[sourceKey].files
    ),
    writeTargetFiles(
        resolve(targetRoot, 'workflow-action'),
        workflowAction[sourceKey].files
    ),
    writeTargetFiles(resolve(targetRoot, 'list-query-v2'), listQueryV2.files),
    writeTargetFiles(
        resolve(targetRoot, 'list-query-v2-public'),
        publicListQueryV2.files
    ),
    writeTargetFiles(
        resolve(targetRoot, 'list-query-v2-tasks-actions-processing-type'),
        parameterizedListQueryV2.files
    ),
    writeTargetFiles(
        resolve(targetRoot, 'list-query-v2-users'),
        usersListQuery.files
    ),
    writeTargetFiles(
        resolve(targetRoot, 'action-request-v2'),
        actionRequestV2.files
    ),
    writeTargetFiles(
        resolve(targetRoot, 'page-composition-v2'),
        pageComposition[sourceKey].files
    ),
    writeTargetFiles(
        resolve(targetRoot, 'page-composition-users-v2'),
        usersPageComposition[sourceKey].files
    ),
    writeTargetFiles(resolve(targetRoot, 'behavior-graph'), behaviorGraphFiles),
    writeTargetFiles(
        resolve(targetRoot, 'presentation-flow'),
        presentationFlowFiles
    ),
]);

if (target === 'angular') {
    const otherTargets = await runtimeFileHashes(targetRoot);
    const productRoot = resolve(outputRoot, 'application-session-products');
    await rm(productRoot, { recursive: true, force: true });
    for (const domain of SESSION_FIXTURE_DOMAINS) {
        const data = await createApplicationSessionFixture({ domain });
        try {
            const destination = resolve(
                targetRoot,
                'application-session',
                domain
            );
            const experience = data.design.experiences[0];
            const shell = await renderAngularPwaShell({
                design: data.design,
                experienceId: experience.id,
                appName: domain,
                designPath: `design/${domain}.json`,
                designSha256: data.pages.values().next().value.pageContract
                    .design_ref.sha256,
                externalWorkspace: true,
            });
            // Product configuration belongs to a real product workspace, not
            // to Vite's nearest-tsconfig lookup in the session test target.
            const productDestination = resolve(productRoot, domain);
            const expectedProductFiles = { ...shell.files };
            await writeTargetFiles(productDestination, shell.files);
            await writeTargetFiles(
                destination,
                Object.fromEntries(
                    Object.entries(shell.files).filter(([path]) =>
                        path.startsWith('src/')
                    )
                )
            );
            async function writeSessionFiles(relativeRoot, files) {
                for (const [path, content] of Object.entries(files)) {
                    const name = relative(
                        productDestination,
                        resolve(productDestination, relativeRoot, path)
                    )
                        .split(sep)
                        .join('/');
                    expectedProductFiles[name] = content;
                }
                await Promise.all(
                    [destination, productDestination].map((root) =>
                        writeTargetFiles(resolve(root, relativeRoot), files)
                    )
                );
            }
            const exported = [
                "export { App } from './src/app/app';",
                "export { appRoutes } from './src/app/app.routes';",
                "export * from './src/app/session';",
                "export { applicationSessionInterceptor } from './src/app/session/session.interceptor';",
                "export { applicationSessionGuard } from './src/app/session/session.guard';",
                "export { consumedRoutes } from './fixture-consumers';",
            ];
            for (const [id, { model }] of data.actions) {
                const action = renderAngularActionRequestV2(model, {
                    services: {
                        [domain + '-service']: {
                            module: '../../../src/app/session',
                            token: sessionEndpointToken(domain + '-service'),
                        },
                    },
                });
                await writeSessionFiles(`actions/${id}`, action.files);
                const role = id.slice(domain.length + 1),
                    name = pascalCase(id);
                exported.push(
                    `export { ${name}Facade as ${pascalCase(role)}Facade } from './actions/${id}/src/${id}.facade';`
                );
                exported.push(
                    `export { ${name}Source as ${pascalCase(role)}Source } from './actions/${id}/src/${id}.source';`
                );
            }
            const pages = {};
            for (const [id, page] of data.pages) {
                const role = page.page.path.slice(1);
                pages[role] = id;
                if (!page.plan) continue;
                const hostBindings = structuredClone(data.hostBindings);
                hostBindings.session.module = '../../../session';
                hostBindings.services[domain + '-service'].module =
                    '../../../../../session';
                const result =
                    await pageCompositionTargets.computeAngularPageCompositionTarget(
                        {
                            plan: page.plan,
                            artifactRoot: data.root,
                            hostBindings,
                        }
                    );
                await writeSessionFiles(
                    `src/app/pages/${id}/execution`,
                    Object.fromEntries(
                        Object.entries(result.angular.files).map(
                            ([path, content]) => [
                                path.replace(/^src\//, ''),
                                content,
                            ]
                        )
                    )
                );
                const name = pascalCase(role);
                exported.push(
                    `export { PageComposition as ${name}Composition } from './src/app/pages/${id}/execution/page-composition';`
                );
                exported.push(
                    `export { PAGE_COMPOSITION_PROVIDERS as ${name.toUpperCase()}_PROVIDERS } from './src/app/pages/${id}/execution/page-composition.providers';`
                );
            }
            exported.push(
                `export const fixture = ${JSON.stringify({
                    domain,
                    names: data.names,
                    pages,
                    sessionResult: data.sessionResult,
                    wireResponse: data.wireResponse,
                    commandResult: data.commandResult,
                    enterInput: data.enterInput,
                    // Chemins déclarés par le contrat du fixture (source unique).
                    operations: Object.fromEntries(
                        data.contract.operations.map((operation) => [
                            operation.id.slice(domain.length + 1),
                            operation.path,
                        ])
                    ),
                    endpoint: {
                        contract_id: data.contract.contract.id,
                        service_id: domain + '-service',
                        base_url: `https://${domain}.example/api`,
                    },
                    inputFixtureOnly: true,
                    networkVerified: false,
                })} as const;`
            );
            await writeSessionFiles('.', {
                'fixture-consumers.ts': sessionConsumers(data),
                'fixture-runtime.ts': exported.join('\n') + '\n',
            });
            // These filesystem invariants run in Node during preparation,
            // before the browser-oriented TypeScript and Vitest commands.
            const productHashes = await runtimeFileHashes(productDestination);
            for (const path of [
                'project.json',
                'tsconfig.json',
                'tsconfig.app.json',
                'tsconfig.spec.json',
                'eslint.config.mjs',
                'public/manifest.webmanifest',
            ]) {
                assert.ok(
                    Object.hasOwn(productHashes, path),
                    `session product must retain its native configuration: ${path}`
                );
            }
            assert.deepEqual(
                productHashes,
                Object.fromEntries(
                    Object.entries(expectedProductFiles).map(
                        ([path, content]) => [
                            path,
                            createHash('sha256').update(content).digest('hex'),
                        ]
                    )
                ),
                'session product output must contain every native file'
            );
            const testPaths = Object.keys(await runtimeFileHashes(destination));
            for (const path of [
                'src/app/app.ts',
                'fixture-consumers.ts',
                'fixture-runtime.ts',
            ]) {
                assert.ok(
                    testPaths.includes(path),
                    `session test target must contain its entry point: ${path}`
                );
            }
            const toolConfiguration =
                /(?:^|\/)(?:tsconfig(?:\.[^/]+)?\.json|(?:project|package|angular|nx)\.json|(?:eslint|vite|vitest)\.config\.[^/]+|\.eslintrc(?:\.[^/]+)?)$/;
            assert.deepEqual(
                testPaths.filter((path) => toolConfiguration.test(path)),
                [],
                'session test target must not contain product tool configuration'
            );
            assert.ok(
                testPaths.every(
                    (path) =>
                        !path.startsWith('.cmz/') && !path.startsWith('public/')
                ),
                'session test target must not contain product metadata or assets'
            );
            const expectedTestPaths = Object.keys(expectedProductFiles).filter(
                (path) =>
                    !Object.hasOwn(shell.files, path) || path.startsWith('src/')
            );
            assert.deepEqual(
                testPaths.sort(),
                expectedTestPaths.sort(),
                'session test target must contain every source and fixture file'
            );
            for (const path of testPaths) {
                assert.deepEqual(
                    await readFile(resolve(destination, path)),
                    await readFile(resolve(productDestination, path)),
                    `session source must be byte-identical in both outputs: ${path}`
                );
            }
        } finally {
            await rm(data.root, { recursive: true, force: true });
        }
    }
    assert.equal(
        await readFile(resolve(targetRoot, 'tsconfig.json'), 'utf8'),
        runtimeConfigurationFiles['tsconfig.json'],
        'shared Angular test configuration must remain unchanged'
    );
    const afterSession = await runtimeFileHashes(targetRoot);
    for (const path of Object.keys(afterSession))
        if (path.startsWith('application-session/')) delete afterSession[path];
    assert.deepEqual(
        afterSession,
        otherTargets,
        'session preparation changed another target'
    );
    await prepareSessionTestWorkspace();
}

console.log(`Prepared generated ${target} sources for native stack tests.`);
