import { createHash } from 'node:crypto';
import {
    readBoundedPageFile,
    parsePageDocument,
} from './core/page-session-binding.mjs';
import { lstat, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep, posix } from 'node:path';

import {
    bindRenderedArtifacts,
    buildArtifactPlan,
} from './core/artifact-plan.mjs';
import { validateActionRequestV2ExecutionModel } from './core/action-request-v2-compiler.mjs';
import { canonicalizeGeneratedFiles } from './core/canonicalize-generated.mjs';
import { buildGenerationManifest } from './core/generation-manifest.mjs';
import { validateListQueryV2ExecutionModel } from './core/list-query-v2-compiler.mjs';
import {
    validatePageExecutionCapabilities,
    validatePageExecutionPlan,
    compilePageExecutionPlan,
} from './core/page-execution-plan.mjs';
import { typecheckGenerated } from './core/typecheck-generated.mjs';
import { renderAngularActionRequestV2 } from './renderers/angular-action-request-v2-renderer.mjs';
import { renderAngularListQueryV2 } from './renderers/angular-list-query-v2-renderer.mjs';
import {
    renderSessionQueryFacade,
    renderSessionHostSupport,
    renderSessionEndpointTokens,
    renderSessionProjection,
    sessionEndpointToken,
} from './renderers/angular-application-session-renderer.mjs';
import { observationInputPrimitives as observationIO } from './core/runtime-observation-evidence.mjs';
import {
    ANGULAR_PAGE_COMPOSITION_CAPABILITIES,
    renderAngularPageComposition,
} from './renderers/angular-page-composition-renderer.mjs';
import { renderReactActionRequestV2 } from './renderers/react-action-request-v2-renderer.mjs';
import { renderReactListQueryV2 } from './renderers/react-list-query-v2-renderer.mjs';
import {
    REACT_PAGE_COMPOSITION_CAPABILITIES,
    renderReactPageComposition,
} from './renderers/react-page-composition-renderer.mjs';
import {
    loadJson,
    repositoryRoot,
    validateJsonSchema,
} from './validate-ir.mjs';

const ANGULAR_PROFILE = new URL(
    './profiles/angular-nx.profile.json',
    import.meta.url
);
const REACT_PROFILE = new URL(
    './profiles/react-typescript.profile.json',
    import.meta.url
);
const PLAN_SCHEMA = new URL(
    './schemas/page-execution-plan.schema.json',
    import.meta.url
);
const HOST_BINDINGS_SCHEMA = new URL(
    './schemas/angular-page-host-bindings.schema.json',
    import.meta.url
);

function fail(message) {
    throw new Error(`page composition target: ${message}`);
}

function digest(document) {
    return createHash('sha256').update(document).digest('hex');
}

async function readRegularArtifact(root, uri) {
    const path = resolve(root, uri);
    const workspaceRelative = relative(root, path);
    if (
        workspaceRelative === '..' ||
        workspaceRelative.startsWith(`..${sep}`) ||
        isAbsolute(workspaceRelative)
    ) {
        fail(`${uri} must stay inside the artifact root`);
    }
    const metadata = await lstat(path);
    if (!metadata.isFile() || metadata.isSymbolicLink()) {
        fail(`${uri} must be a regular non-symlink file`);
    }
    const [canonicalRoot, canonicalPath] = await Promise.all([
        realpath(root),
        realpath(path),
    ]);
    const canonicalRelative = relative(canonicalRoot, canonicalPath);
    if (
        canonicalRelative === '..' ||
        canonicalRelative.startsWith(`..${sep}`) ||
        isAbsolute(canonicalRelative)
    ) {
        fail(`${uri} must resolve inside the artifact root`);
    }
    return readBoundedPageFile(canonicalPath);
}

function assertErrors(label, errors) {
    if (errors.length > 0) fail(`${label}\n${errors.join('\n')}`);
}

function assertPrimitiveReference(node, model) {
    const reference = node.primitive_ref;
    if (
        model.kind !== reference.kind ||
        model.schema_version !== reference.schema_version ||
        model.model_id !== reference.model_id
    ) {
        fail(`${node.id} primitive identity differs from its document`);
    }
    const collection =
        reference.kind === 'list-query-execution-model'
            ? model.queries
            : model.actions;
    const operation = collection.find(
        (candidate) => candidate.id === reference.operation_id
    );
    if (!operation) fail(`${node.id} primitive operation is absent`);
    if (
        model.backend_contract.id !== node.operation_ref.contract_id ||
        operation.transport.operation_id !== node.operation_ref.operation_id
    ) {
        fail(`${node.id} backend operation differs from the page plan`);
    }
    if (model.kind === 'action-request-execution-model') {
        const invalidationCapability = `action.invalidation.${operation.controller.execution.invalidation.mode}@1`;
        if (!node.capabilities.includes(invalidationCapability)) {
            fail(
                `${node.id} invalidation capability differs from its primitive`
            );
        }
    }
    return operation;
}

function serviceBinding(hostBindings, serviceId) {
    const binding = hostBindings.services[serviceId];
    if (!binding) fail(`missing host binding for ${serviceId}`);
    return { services: { [serviceId]: binding } };
}

async function renderAngularPrimitive(node, model, operation, hostBindings) {
    const kind =
        model.kind === 'list-query-execution-model' ? 'query' : 'command';
    const artifactPlan = buildArtifactPlan(model, model.kind);
    const sessionMode = hostBindings.schema_version === '1.1.0';
    const binding = hostBindings.services[operation.transport.service_id];
    const rendered =
        kind === 'query'
            ? renderAngularListQueryV2(
                  model,
                  sessionMode
                      ? {
                            services: {
                                [operation.transport.service_id]: {
                                    module: '@cmz/core',
                                    token: binding.token,
                                },
                            },
                        }
                      : serviceBinding(
                            hostBindings,
                            operation.transport.service_id
                        )
              )
            : renderAngularActionRequestV2(
                  model,
                  serviceBinding(hostBindings, operation.transport.service_id),
                  COMPOSITION_COMMAND_OPTIONS
              );
    if (sessionMode && kind === 'query') {
        // Transport and decoder remain the existing native renderer's output.
        // The session host substitutes its real local imports and a native
        // rxResource facade that discards values from previous principals.
        for (const [path, source] of Object.entries(rendered.files))
            rendered.files[path] = source
                .replaceAll("from '@cmz/core'", `from '${binding.module}'`)
                .replaceAll(
                    "from '@cmz/shared-domain'",
                    `from '${binding.module}'`
                );
        rendered.files[`src/${operation.id}.facade.ts`] =
            renderSessionQueryFacade(operation, binding);
    }
    const files = await canonicalizeGeneratedFiles(rendered.files);
    return {
        kind,
        nodeId: node.id,
        target: {
            ...rendered,
            ...bindRenderedArtifacts(
                artifactPlan,
                files,
                angularPrimitiveBindings(node.id, files)
            ),
        },
    };
}

// Artefact de chaque fichier d'une primitive Angular rendue pour un nœud.
export function angularPrimitiveBindings(nodeId, files) {
    return Object.fromEntries(
        Object.keys(files).map((path) => {
            if (path === 'src/index.ts') return [path, 'public-api'];
            if (path === 'src/models.ts') return [path, 'domain-model'];
            if (path.startsWith('src/response.') && path.endsWith('.types.ts'))
                return [path, 'domain-model'];
            if (
                path === 'src/response-runtime.ts' ||
                path.startsWith('src/response.')
            )
                return [path, 'response-decoder'];
            if (path === 'src/validation.ts') return [path, 'input-validator'];
            if (path.endsWith('.decoder.ts')) return [path, 'response-decoder'];
            if (path.endsWith('.source.ts'))
                return [path, 'integration-client'];
            if (path.endsWith('.facade.ts'))
                return [path, 'execution-controller'];
            fail(`${nodeId} produced an unclassified file ${path}`);
        })
    );
}

// Options du rendu d'une commande comme nœud de composition.
export const COMPOSITION_COMMAND_OPTIONS = Object.freeze({
    allowAuthenticated: true,
    allowCallerDeclaredInvalidation: true,
    allowRequiredStringFields: true,
    allowStatusEnvelope: true,
});

// X4-sécurité-3, G3 : option du profil extérieur seulement. Le profil interne
// garde COMPOSITION_COMMAND_OPTIONS et une sortie identique à l'octet.
export const EXTERNAL_COMPOSITION_COMMAND_OPTIONS = Object.freeze({
    ...COMPOSITION_COMMAND_OPTIONS,
    deferServiceAddress: true,
});

async function renderReactPrimitive(node, model) {
    const kind =
        model.kind === 'list-query-execution-model' ? 'query' : 'command';
    const artifactPlan = buildArtifactPlan(model, model.kind);
    const rendered =
        kind === 'query'
            ? renderReactListQueryV2(model)
            : renderReactActionRequestV2(model, {
                  allowAuthenticated: true,
                  allowCallerDeclaredInvalidation: true,
                  allowRequiredStringFields: true,
                  allowStatusEnvelope: true,
              });
    const files = await canonicalizeGeneratedFiles(rendered.files);
    const bindings = Object.fromEntries(
        Object.keys(files).map((path) => {
            if (path === 'src/index.ts') return [path, 'public-api'];
            if (path === 'src/models.ts') return [path, 'domain-model'];
            if (path === 'src/errors.ts') return [path, 'response-decoder'];
            if (path === 'src/validation.ts') return [path, 'input-validator'];
            if (path.endsWith('.decoder.ts')) return [path, 'response-decoder'];
            if (path.endsWith('.client.ts'))
                return [path, 'integration-client'];
            if (path.includes('/use-') || path.startsWith('src/use-')) {
                return [path, 'execution-controller'];
            }
            fail(`${node.id} produced an unclassified file ${path}`);
        })
    );
    return {
        kind,
        nodeId: node.id,
        target: {
            ...rendered,
            ...bindRenderedArtifacts(artifactPlan, files, bindings),
        },
    };
}

async function resolveCompositionNodes(plan, artifactRoot, capabilities) {
    const planSchema = await loadJson(PLAN_SCHEMA);
    assertErrors(
        'invalid page execution plan',
        validatePageExecutionPlan(plan, planSchema)
    );
    assertErrors(
        'unsupported page capabilities',
        validatePageExecutionCapabilities(plan, capabilities)
    );
    const pageContractDocument = await readRegularArtifact(
        artifactRoot,
        plan.source.page_contract.uri
    );
    if (digest(pageContractDocument) !== plan.source.page_contract.sha256) {
        fail('page contract document hash is stale');
    }
    const nodes = [...plan.query_nodes, ...plan.command_nodes];
    const documents = new Map();
    const artifacts = new Map();
    const resolved = [];
    for (const node of nodes) {
        const reference = node.primitive_ref;
        const key = `${reference.uri}:${reference.sha256}`;
        let model = documents.get(key);
        if (!model) {
            const document = await readRegularArtifact(
                artifactRoot,
                reference.uri
            );
            if (digest(document) !== reference.sha256) {
                fail(`${node.id} primitive document hash is stale`);
            }
            try {
                model = parsePageDocument(document);
            } catch (error) {
                fail(
                    `${node.id} primitive document is invalid JSON (${error.message})`
                );
            }
            const errors =
                reference.kind === 'list-query-execution-model'
                    ? validateListQueryV2ExecutionModel(model)
                    : validateActionRequestV2ExecutionModel(model);
            assertErrors(`${node.id} primitive document is invalid`, errors);
            documents.set(key, model);
            artifacts.set(key, {
                uri: reference.uri,
                sha256: reference.sha256,
                document,
                kind: reference.kind,
            });
        }
        resolved.push({
            node,
            model,
            operation: assertPrimitiveReference(node, model),
        });
    }
    if (plan.schema_version === '1.1.0') {
        const applicationDesignSchema = await loadJson(
            new URL('./schemas/application-design.schema.json', import.meta.url)
        );
        const values = [...artifacts.values()];
        const expected = compilePageExecutionPlan({
            pageContract: {
                uri: plan.source.page_contract.uri,
                sha256: digest(pageContractDocument),
                document: pageContractDocument,
            },
            listQueryModels: values.filter(
                (artifact) => artifact.kind === 'list-query-execution-model'
            ),
            actionRequestModels: values.filter(
                (artifact) => artifact.kind === 'action-request-execution-model'
            ),
            applicationDesignSchema,
            pageExecutionPlanSchema: planSchema,
        });
        if (JSON.stringify(expected) !== JSON.stringify(plan))
            fail('PAGE_SESSION_RECOMPILATION');
    }
    return {
        resolved,
        pageContract: observationIO.parse(pageContractDocument),
    };
}

async function sessionHostTypecheckFiles(bindings, nodes, pageContract) {
    const support = await renderSessionHostSupport();
    support['session.projection.ts'] = renderSessionProjection();
    support['service-endpoints.ts'] = renderSessionEndpointTokens(
        pageContract.experience.session
    );
    support['index.ts'] += "export * from './service-endpoints';\n";
    const virtual = {};
    function mount(module, from) {
        const folder = module.startsWith('.')
            ? posix.normalize(posix.join(posix.dirname(from), module))
            : 'node_modules/' + module;
        for (const [path, content] of Object.entries(support)) {
            const target = posix.join(folder, path);
            if (virtual[target] !== undefined && virtual[target] !== content)
                fail('PAGE_SESSION_HOST_COLLISION');
            virtual[target] = content;
        }
    }
    mount(bindings.session.module, 'src/page-composition.ts');
    for (const { node, operation } of nodes) {
        const binding = bindings.services[operation.transport.service_id];
        if (
            !binding ||
            binding.token !==
                sessionEndpointToken(operation.transport.service_id)
        )
            fail('PAGE_SESSION_ENDPOINT_TOKEN');
        mount(binding.module, `src/nodes/${node.id}/${operation.id}.source.ts`);
    }
    return virtual;
}

export async function computeAngularPageCompositionTarget({
    plan,
    artifactRoot = repositoryRoot,
    hostBindings,
} = {}) {
    const [hostBindingsSchema, profile, inputs] = await Promise.all([
        loadJson(HOST_BINDINGS_SCHEMA),
        loadJson(ANGULAR_PROFILE),
        resolveCompositionNodes(
            plan,
            artifactRoot,
            ANGULAR_PAGE_COMPOSITION_CAPABILITIES
        ),
    ]);
    assertErrors(
        'invalid Angular host bindings',
        validateJsonSchema(
            hostBindings,
            hostBindings?.schema_version === '1.1.0'
                ? observationIO.parseSchema(
                      Buffer.from(JSON.stringify(hostBindingsSchema))
                  )
                : hostBindingsSchema
        )
    );
    const { resolved: resolvedNodes, pageContract } = inputs;
    if (
        plan.schema_version === '1.1.0' &&
        hostBindings.schema_version !== '1.1.0'
    )
        fail('PAGE_SESSION_HOST_BINDING');
    const renderedNodes = [];
    for (const { node, model, operation } of resolvedNodes) {
        renderedNodes.push(
            await renderAngularPrimitive(node, model, operation, hostBindings)
        );
    }
    const rendered = renderAngularPageComposition(
        plan,
        renderedNodes,
        hostBindings
    );
    const files = await canonicalizeGeneratedFiles(rendered.files);
    const artifactPlan = buildArtifactPlan(plan, 'page-execution-plan');
    const bound = bindRenderedArtifacts(artifactPlan, files, rendered.bindings);
    const hostFiles =
        plan.schema_version === '1.1.0'
            ? await sessionHostTypecheckFiles(
                  hostBindings,
                  resolvedNodes,
                  pageContract
              )
            : {};
    if (Object.keys(hostFiles).some((path) => Object.hasOwn(bound.files, path)))
        fail('PAGE_SESSION_HOST_COLLISION');
    typecheckGenerated(
        { ...bound.files, ...hostFiles },
        'angular-page-composition',
        repositoryRoot
    );
    return {
        plan,
        artifactPlan,
        angular: {
            ...bound,
            manifest: buildGenerationManifest(
                plan,
                artifactPlan,
                profile,
                bound
            ),
        },
    };
}

export async function computeReactPageCompositionTarget({
    plan,
    artifactRoot = repositoryRoot,
} = {}) {
    if (plan?.schema_version === '1.1.0')
        fail('PAGE_SESSION_REACT_UNSUPPORTED');
    const [profile, inputs] = await Promise.all([
        loadJson(REACT_PROFILE),
        resolveCompositionNodes(
            plan,
            artifactRoot,
            REACT_PAGE_COMPOSITION_CAPABILITIES
        ),
    ]);
    const resolvedNodes = inputs.resolved;
    const renderedNodes = [];
    for (const { node, model } of resolvedNodes) {
        renderedNodes.push(await renderReactPrimitive(node, model));
    }
    const rendered = renderReactPageComposition(plan, renderedNodes);
    const files = await canonicalizeGeneratedFiles(rendered.files);
    const artifactPlan = buildArtifactPlan(plan, 'page-execution-plan');
    const bound = bindRenderedArtifacts(artifactPlan, files, rendered.bindings);
    typecheckGenerated(bound.files, 'react-page-composition', repositoryRoot);
    return {
        plan,
        artifactPlan,
        react: {
            ...bound,
            manifest: buildGenerationManifest(
                plan,
                artifactPlan,
                profile,
                bound
            ),
        },
    };
}
