import { createHash } from 'node:crypto';
import { lstat, readFile, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';

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
} from './core/page-execution-plan.mjs';
import { typecheckGenerated } from './core/typecheck-generated.mjs';
import { renderAngularActionRequestV2 } from './renderers/angular-action-request-v2-renderer.mjs';
import { renderAngularListQueryV2 } from './renderers/angular-list-query-v2-renderer.mjs';
import {
    ANGULAR_PAGE_COMPOSITION_CAPABILITIES,
    renderAngularPageComposition,
} from './renderers/angular-page-composition-renderer.mjs';
import {
    loadJson,
    repositoryRoot,
    validateJsonSchema,
} from './validate-ir.mjs';

const PROFILE = new URL('./profiles/angular-nx.profile.json', import.meta.url);
const PLAN_SCHEMA = new URL(
    './schemas/page-execution-plan.schema.json',
    import.meta.url
);
const HOST_BINDINGS_SCHEMA = new URL(
    './schemas/angular-page-host-bindings.schema.json',
    import.meta.url
);

function fail(message) {
    throw new Error(`angular page composition target: ${message}`);
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
    return readFile(canonicalPath);
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
    return operation;
}

function serviceBinding(hostBindings, serviceId) {
    const binding = hostBindings.services[serviceId];
    if (!binding) fail(`missing host binding for ${serviceId}`);
    return { services: { [serviceId]: binding } };
}

async function renderPrimitive(node, model, operation, hostBindings) {
    const kind =
        model.kind === 'list-query-execution-model' ? 'query' : 'command';
    const artifactPlan = buildArtifactPlan(model, model.kind);
    const rendered =
        kind === 'query'
            ? renderAngularListQueryV2(
                  model,
                  serviceBinding(hostBindings, operation.transport.service_id)
              )
            : renderAngularActionRequestV2(
                  model,
                  serviceBinding(hostBindings, operation.transport.service_id)
              );
    const files = await canonicalizeGeneratedFiles(rendered.files);
    const bindings = Object.fromEntries(
        Object.keys(files).map((path) => {
            if (path === 'src/index.ts') return [path, 'public-api'];
            if (path === 'src/models.ts') return [path, 'domain-model'];
            if (path === 'src/validation.ts') return [path, 'input-validator'];
            if (path.endsWith('.decoder.ts')) return [path, 'response-decoder'];
            if (path.endsWith('.source.ts'))
                return [path, 'integration-client'];
            if (path.endsWith('.facade.ts'))
                return [path, 'execution-controller'];
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

export async function computeAngularPageCompositionTarget({
    plan,
    artifactRoot = repositoryRoot,
    hostBindings,
} = {}) {
    const [planSchema, hostBindingsSchema, profile] = await Promise.all([
        loadJson(PLAN_SCHEMA),
        loadJson(HOST_BINDINGS_SCHEMA),
        loadJson(PROFILE),
    ]);
    assertErrors(
        'invalid page execution plan',
        validatePageExecutionPlan(plan, planSchema)
    );
    assertErrors(
        'unsupported Angular page capabilities',
        validatePageExecutionCapabilities(
            plan,
            ANGULAR_PAGE_COMPOSITION_CAPABILITIES
        )
    );
    assertErrors(
        'invalid Angular host bindings',
        validateJsonSchema(hostBindings, hostBindingsSchema)
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
    const renderedNodes = [];
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
                model = JSON.parse(document.toString('utf8'));
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
        }
        const operation = assertPrimitiveReference(node, model);
        renderedNodes.push(
            await renderPrimitive(node, model, operation, hostBindings)
        );
    }
    const rendered = renderAngularPageComposition(plan, renderedNodes);
    const files = await canonicalizeGeneratedFiles(rendered.files);
    const artifactPlan = buildArtifactPlan(plan, 'page-execution-plan');
    const bound = bindRenderedArtifacts(artifactPlan, files, rendered.bindings);
    typecheckGenerated(bound.files, 'angular-page-composition', repositoryRoot);
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
