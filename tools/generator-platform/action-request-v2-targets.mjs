import { lstat, readFile, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';

import {
    validateBackendContract,
    verifyBackendContractSnapshots,
} from './core/backend-contract.mjs';
import {
    bindRenderedArtifacts,
    buildArtifactPlan,
} from './core/artifact-plan.mjs';
import { compileActionRequestV2ExecutionModel } from './core/action-request-v2-compiler.mjs';
import {
    readActionRequestDefinition,
    actionGraphSnapshotReader,
} from './core/action-request-result-graph.mjs';
import { observationInputPrimitives as observationIO } from './core/runtime-observation-evidence.mjs';
import { canonicalizeGeneratedFiles } from './core/canonicalize-generated.mjs';
import { buildGenerationManifest } from './core/generation-manifest.mjs';
import { typecheckGenerated } from './core/typecheck-generated.mjs';
import { renderAngularActionRequestV2 } from './renderers/angular-action-request-v2-renderer.mjs';
import { renderReactActionRequestV2 } from './renderers/react-action-request-v2-renderer.mjs';
import {
    loadJson,
    repositoryRoot,
    validateJsonSchema,
} from './validate-ir.mjs';

const DEFAULT_DEFINITION = resolve(
    repositoryRoot,
    'tools/generator-platform/fixtures/forgot-password.v2.definition.json'
);
const BACKEND_SCHEMA = new URL(
    './schemas/backend-contract.schema.json',
    import.meta.url
);
const DEFINITION_SCHEMA = new URL(
    './schemas/action-request-definition-v2.schema.json',
    import.meta.url
);
const ANGULAR_PROFILE = new URL(
    './profiles/angular-nx.profile.json',
    import.meta.url
);
const REACT_PROFILE = new URL(
    './profiles/react-typescript.profile.json',
    import.meta.url
);

export const cmzAngularActionRequestHostBindings = Object.freeze({
    services: Object.freeze({
        'authentication-api': Object.freeze({
            module: '@cmz/core',
            token: 'AUTH_API_URL',
        }),
    }),
});

function failOnErrors(label, errors) {
    if (errors.length > 0) {
        throw new Error(`${label}:\n${errors.join('\n')}`);
    }
}

function resolveBackendPath(uri, artifactRoot = repositoryRoot) {
    if (typeof uri !== 'string') {
        throw new Error('backend contract uri must be a string');
    }
    const path = resolve(artifactRoot, uri);
    const workspaceRelative = relative(artifactRoot, path);
    if (
        workspaceRelative === '..' ||
        workspaceRelative.startsWith(`..${sep}`) ||
        isAbsolute(workspaceRelative)
    ) {
        throw new Error('backend contract uri must stay inside the workspace');
    }
    return path;
}

async function readBackendDocument(
    uri,
    graphMode = false,
    artifactRoot = repositoryRoot
) {
    const path = resolveBackendPath(uri, artifactRoot);
    const metadata = await lstat(path);
    if (!metadata.isFile() || metadata.isSymbolicLink()) {
        throw new Error('backend contract must be a regular non-symlink file');
    }
    const [canonicalRoot, canonicalPath] = await Promise.all([
        realpath(artifactRoot),
        realpath(path),
    ]);
    const canonicalRelative = relative(canonicalRoot, canonicalPath);
    if (
        canonicalRelative === '..' ||
        canonicalRelative.startsWith(`..${sep}`) ||
        isAbsolute(canonicalRelative)
    ) {
        throw new Error('backend contract must resolve inside the workspace');
    }
    return graphMode
        ? observationIO.boundedFile(canonicalRoot, canonicalRelative, 1048576)
        : readFile(canonicalPath);
}

async function computeModel(
    definitionPath,
    definitionDocument,
    artifactRoot = repositoryRoot
) {
    const loaded = await readActionRequestDefinition(
        definitionPath,
        definitionDocument
    );
    const definition = loaded.definition;
    const graphMode = definition.schema_version === '2.1.0';
    if (!graphMode && artifactRoot !== repositoryRoot)
        throw new Error('AR_GRAPH_ROOT_VERSION');
    const [backendSchema, definitionSchema] = await Promise.all([
        loadJson(BACKEND_SCHEMA),
        loadJson(DEFINITION_SCHEMA),
    ]);
    failOnErrors(
        'invalid active action-request definition',
        graphMode
            ? validateJsonSchema(definition, definitionSchema).length
                ? ['AR_GRAPH_SCHEMA']
                : []
            : validateJsonSchema(definition, definitionSchema)
    );
    const backendDocument = await readBackendDocument(
        definition.backend_contract.uri,
        graphMode,
        artifactRoot
    );
    const backendContract = graphMode
        ? observationIO.parse(backendDocument)
        : JSON.parse(backendDocument.toString('utf8'));
    const backendErrors = validateBackendContract(
        backendContract,
        backendSchema
    );
    failOnErrors(
        'invalid active backend contract',
        graphMode && backendErrors.length ? ['AR_GRAPH_BACKEND'] : backendErrors
    );
    const provenanceErrors = await verifyBackendContractSnapshots(
        backendContract,
        artifactRoot,
        graphMode
            ? actionGraphSnapshotReader(backendContract, artifactRoot)
            : undefined
    );
    failOnErrors(
        'invalid active backend provenance',
        graphMode && provenanceErrors.length
            ? ['AR_GRAPH_PROVENANCE']
            : provenanceErrors
    );
    const model = compileActionRequestV2ExecutionModel({
        definition,
        backendContractDocument: backendDocument,
        backendContractUri: definition.backend_contract.uri,
    });
    return { definition, model };
}

async function materializeAngularTarget(
    model,
    artifactPlan,
    hostBindings,
    { typecheck = true, renderOptions } = {}
) {
    const profile = await loadJson(ANGULAR_PROFILE);
    const rendered = renderAngularActionRequestV2(
        model,
        hostBindings,
        renderOptions
    );
    const files = await canonicalizeGeneratedFiles(rendered.files);
    const bindings = {
        'src/index.ts': 'public-api',
        [`src/${rendered.actionId}.decoder.ts`]: 'response-decoder',
        [`src/${rendered.actionId}.facade.ts`]: 'execution-controller',
        [`src/${rendered.actionId}.source.ts`]: 'integration-client',
        'src/models.ts': 'domain-model',
        'src/validation.ts': 'input-validator',
    };
    for (const path of Object.keys(files)) {
        if (path.startsWith('src/response.') && path.endsWith('.types.ts'))
            bindings[path] = 'domain-model';
        else if (
            path === 'src/response-runtime.ts' ||
            path.startsWith('src/response.')
        )
            bindings[path] = 'response-decoder';
    }
    const bound = bindRenderedArtifacts(artifactPlan, files, bindings);
    if (typecheck) typecheckGenerated(bound.files, profile.id, repositoryRoot);
    return {
        ...rendered,
        ...bound,
        manifest: buildGenerationManifest(model, artifactPlan, profile, bound),
    };
}

async function materializeReactTarget(model, artifactPlan) {
    const profile = await loadJson(REACT_PROFILE);
    const rendered = renderReactActionRequestV2(model);
    const files = await canonicalizeGeneratedFiles(rendered.files);
    const bound = bindRenderedArtifacts(artifactPlan, files, {
        'src/index.ts': 'public-api',
        [`src/${rendered.actionId}.client.ts`]: 'integration-client',
        [`src/${rendered.actionId}.decoder.ts`]: 'response-decoder',
        [`src/use-${rendered.actionId}.ts`]: 'execution-controller',
        'src/models.ts': 'domain-model',
        'src/validation.ts': 'input-validator',
    });
    typecheckGenerated(bound.files, profile.id, repositoryRoot);
    return {
        ...rendered,
        ...bound,
        manifest: buildGenerationManifest(model, artifactPlan, profile, bound),
    };
}

export async function computeActionRequestV2Targets({
    definitionPath = DEFAULT_DEFINITION,
    definitionDocument,
    hostBindings = cmzAngularActionRequestHostBindings,
    target = 'all',
    artifactRoot = repositoryRoot,
} = {}) {
    const { definition, model } = await computeModel(
        definitionPath,
        definitionDocument,
        artifactRoot
    );
    const artifactPlan = buildArtifactPlan(
        model,
        'action-request-execution-model'
    );
    if (model.schema_version === '1.1.0') {
        if (target !== 'angular') throw new Error('AR_GRAPH_REACT_UNSUPPORTED');
        return {
            definition,
            model,
            artifactPlan,
            angular: await materializeAngularTarget(
                model,
                artifactPlan,
                hostBindings
            ),
        };
    }
    const [angular, react] = await Promise.all([
        materializeAngularTarget(model, artifactPlan, hostBindings),
        materializeReactTarget(model, artifactPlan),
    ]);
    return { definition, model, artifactPlan, angular, react };
}

export async function computeAngularActionRequestV2Target({
    definitionPath = DEFAULT_DEFINITION,
    hostBindings = cmzAngularActionRequestHostBindings,
    artifactRoot = repositoryRoot,
} = {}) {
    const { definition, model } = await computeModel(
        definitionPath,
        undefined,
        artifactRoot
    );
    const artifactPlan = buildArtifactPlan(
        model,
        'action-request-execution-model'
    );
    return {
        definition,
        model,
        artifactPlan,
        ...(await materializeAngularTarget(model, artifactPlan, hostBindings)),
    };
}

export async function computeReactActionRequestV2Target({
    definitionPath = DEFAULT_DEFINITION,
} = {}) {
    const { definition, model } = await computeModel(definitionPath);
    const artifactPlan = buildArtifactPlan(
        model,
        'action-request-execution-model'
    );
    return {
        definition,
        model,
        artifactPlan,
        ...(await materializeReactTarget(model, artifactPlan)),
    };
}

// X2 : sortie destinée à un produit extérieur. Les liaisons d'hôte dépendent
// du service du modèle compilé ; le typage est fait par le compilateur du
// produit sur son candidat de publication, jamais par celui de l'atelier.
export async function computeExternalAngularActionRequestTarget({
    definitionPath,
    definitionDocument,
    artifactRoot,
    hostBindings,
}) {
    const { definition, model } = await computeModel(
        definitionPath,
        definitionDocument,
        artifactRoot
    );
    if (model.schema_version !== '1.1.0')
        throw new Error('AR_GRAPH_ROOT_VERSION');
    const artifactPlan = buildArtifactPlan(
        model,
        'action-request-execution-model'
    );
    return {
        definition,
        model,
        artifactPlan,
        ...(await materializeAngularTarget(
            model,
            artifactPlan,
            hostBindings(model),
            // X4-sécurité-3, G3 : même option que la composition extérieure.
            { typecheck: false, renderOptions: { deferServiceAddress: true } }
        )),
    };
}
