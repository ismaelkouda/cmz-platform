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
import { canonicalizeGeneratedFiles } from './core/canonicalize-generated.mjs';
import { buildGenerationManifest } from './core/generation-manifest.mjs';
import { compileListQueryV2ExecutionModel } from './core/list-query-v2-compiler.mjs';
import { typecheckGenerated } from './core/typecheck-generated.mjs';
import { renderAngularListQueryV2 } from './renderers/angular-list-query-v2-renderer.mjs';
import { renderReactListQueryV2 } from './renderers/react-list-query-v2-renderer.mjs';
import {
    loadJson,
    repositoryRoot,
    validateJsonSchema,
} from './validate-ir.mjs';

const DEFAULT_DEFINITION = resolve(
    repositoryRoot,
    'tools/generator-platform/fixtures/site-group-select.v2.definition.json'
);
const BACKEND_SCHEMA = new URL(
    './schemas/backend-contract.schema.json',
    import.meta.url
);
const DEFINITION_SCHEMA = new URL(
    './schemas/list-query-definition-v2.schema.json',
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

export const cmzAngularListQueryHostBindings = Object.freeze({
    services: Object.freeze({
        'settings-api': Object.freeze({
            module: '@cmz/core',
            token: 'SETTINGS_API_URL',
        }),
        'report-api': Object.freeze({
            module: '@cmz/core',
            token: 'REPORT_API_URL',
        }),
    }),
});

function failOnErrors(label, errors) {
    if (errors.length > 0) {
        throw new Error(`${label}:\n${errors.join('\n')}`);
    }
}

function resolveBackendPath(uri) {
    if (typeof uri !== 'string') {
        throw new Error('backend contract uri must be a string');
    }
    const path = resolve(repositoryRoot, uri);
    const workspaceRelative = relative(repositoryRoot, path);
    if (
        workspaceRelative === '..' ||
        workspaceRelative.startsWith(`..${sep}`) ||
        isAbsolute(workspaceRelative)
    ) {
        throw new Error('backend contract uri must stay inside the workspace');
    }
    return path;
}

async function readBackendDocument(uri) {
    const path = resolveBackendPath(uri);
    const metadata = await lstat(path);
    if (!metadata.isFile() || metadata.isSymbolicLink()) {
        throw new Error('backend contract must be a regular non-symlink file');
    }
    const [canonicalRoot, canonicalPath] = await Promise.all([
        realpath(repositoryRoot),
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
    return readFile(canonicalPath);
}

async function computeListQueryV2Model(definitionPath, definitionDocument) {
    definitionDocument ??= await readFile(definitionPath);
    const definition = JSON.parse(definitionDocument.toString('utf8'));
    const [backendSchema, definitionSchema] = await Promise.all([
        loadJson(BACKEND_SCHEMA),
        loadJson(DEFINITION_SCHEMA),
    ]);
    failOnErrors(
        'invalid active list-query definition',
        validateJsonSchema(definition, definitionSchema)
    );
    const backendDocument = await readBackendDocument(
        definition.backend_contract.uri
    );
    const backendContract = JSON.parse(backendDocument.toString('utf8'));
    failOnErrors(
        'invalid active backend contract',
        validateBackendContract(backendContract, backendSchema)
    );
    failOnErrors(
        'invalid active backend provenance',
        await verifyBackendContractSnapshots(backendContract, repositoryRoot)
    );
    const model = compileListQueryV2ExecutionModel({
        definition,
        backendContractDocument: backendDocument,
        backendContractUri: definition.backend_contract.uri,
    });
    return { definition, model };
}

async function materializeAngularTarget(model, artifactPlan, hostBindings) {
    const profile = await loadJson(ANGULAR_PROFILE);
    const rendered = renderAngularListQueryV2(model, hostBindings);
    const files = await canonicalizeGeneratedFiles(rendered.files);
    const bound = bindRenderedArtifacts(artifactPlan, files, {
        'src/index.ts': 'public-api',
        [`src/${rendered.queryId}.decoder.ts`]: 'response-decoder',
        [`src/${rendered.queryId}.facade.ts`]: 'execution-controller',
        [`src/${rendered.queryId}.source.ts`]: 'integration-client',
        'src/models.ts': 'domain-model',
    });
    typecheckGenerated(bound.files, profile.id, repositoryRoot);
    return {
        ...rendered,
        ...bound,
        manifest: buildGenerationManifest(model, artifactPlan, profile, bound),
    };
}

async function materializeReactTarget(model, artifactPlan) {
    const profile = await loadJson(REACT_PROFILE);
    const rendered = renderReactListQueryV2(model);
    const files = await canonicalizeGeneratedFiles(rendered.files);
    const bound = bindRenderedArtifacts(artifactPlan, files, {
        'src/errors.ts': 'response-decoder',
        'src/index.ts': 'public-api',
        [`src/${rendered.queryId}.client.ts`]: 'integration-client',
        [`src/${rendered.queryId}.decoder.ts`]: 'response-decoder',
        [`src/use-${rendered.queryId}.ts`]: 'execution-controller',
        'src/models.ts': 'domain-model',
    });
    typecheckGenerated(bound.files, profile.id, repositoryRoot);
    return {
        ...rendered,
        ...bound,
        manifest: buildGenerationManifest(model, artifactPlan, profile, bound),
    };
}

export async function computeListQueryV2Targets({
    definitionPath = DEFAULT_DEFINITION,
    definitionDocument,
    hostBindings = cmzAngularListQueryHostBindings,
} = {}) {
    const { definition, model } = await computeListQueryV2Model(
        definitionPath,
        definitionDocument
    );
    const artifactPlan = buildArtifactPlan(model, 'list-query-execution-model');
    const [angular, react] = await Promise.all([
        materializeAngularTarget(model, artifactPlan, hostBindings),
        materializeReactTarget(model, artifactPlan),
    ]);
    return { definition, model, artifactPlan, angular, react };
}

export async function computeAngularListQueryV2Target({
    definitionPath = DEFAULT_DEFINITION,
    hostBindings = cmzAngularListQueryHostBindings,
} = {}) {
    const { definition, model } = await computeListQueryV2Model(definitionPath);
    const artifactPlan = buildArtifactPlan(model, 'list-query-execution-model');
    return {
        definition,
        model,
        artifactPlan,
        ...(await materializeAngularTarget(model, artifactPlan, hostBindings)),
    };
}

export async function computeReactListQueryV2Target({
    definitionPath = DEFAULT_DEFINITION,
} = {}) {
    const { definition, model } = await computeListQueryV2Model(definitionPath);
    const artifactPlan = buildArtifactPlan(model, 'list-query-execution-model');
    return {
        definition,
        model,
        artifactPlan,
        ...(await materializeReactTarget(model, artifactPlan)),
    };
}
