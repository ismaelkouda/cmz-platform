import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { adaptRequestsWorkflow } from './adapters/requests-workflow-adapter.mjs';
import { buildArtifactPlan } from './core/artifact-plan.mjs';
import { buildGenerationManifest } from './core/generation-manifest.mjs';
import { typecheckGenerated } from './core/typecheck-generated.mjs';
import { renderAngularWorkflow } from './renderers/angular-workflow-renderer.mjs';
import { renderReactWorkflow } from './renderers/react-workflow-renderer.mjs';
import {
    loadJson,
    repositoryRoot,
    validateJsonSchema,
} from './validate-ir.mjs';

const directory = dirname(fileURLToPath(import.meta.url));
const paths = {
    angularManifest: resolve(
        directory,
        'manifests/angular-workflow.manifest.json'
    ),
    artifactPlanSchema: resolve(directory, 'schemas/artifact-plan.schema.json'),
    angularProfile: resolve(directory, 'profiles/angular-nx.profile.json'),
    behaviorSchema: resolve(directory, 'schemas/behavior-model.schema.json'),
    evidenceSchema: resolve(directory, 'schemas/workflow-evidence.schema.json'),
    manifestSchema: resolve(
        directory,
        'schemas/generation-manifest.schema.json'
    ),
    reactManifest: resolve(directory, 'manifests/react-workflow.manifest.json'),
    reactProfile: resolve(directory, 'profiles/react-typescript.profile.json'),
};

export async function computeWorkflowTargets(model) {
    const behavior =
        model ?? (await adaptRequestsWorkflow(repositoryRoot)).behavior;
    const [angularProfile, reactProfile] = await Promise.all([
        loadJson(paths.angularProfile),
        loadJson(paths.reactProfile),
    ]);
    const artifactPlan = buildArtifactPlan(behavior, 'behavior-model');
    const angularRendered = renderAngularWorkflow(
        behavior,
        artifactPlan,
        angularProfile
    );
    const reactRendered = renderReactWorkflow(
        behavior,
        artifactPlan,
        reactProfile
    );
    typecheckGenerated(
        angularRendered.files,
        'angular-workflow',
        repositoryRoot
    );
    typecheckGenerated(reactRendered.files, 'react-workflow', repositoryRoot);
    return {
        model: behavior,
        artifactPlan,
        angular: {
            files: angularRendered.files,
            manifest: buildGenerationManifest(
                behavior,
                artifactPlan,
                angularProfile,
                angularRendered
            ),
        },
        react: {
            files: reactRendered.files,
            manifest: buildGenerationManifest(
                behavior,
                artifactPlan,
                reactProfile,
                reactRendered
            ),
        },
    };
}

export async function verifyWorkflowTargets() {
    const bundle = await adaptRequestsWorkflow(repositoryRoot);
    const [
        computed,
        artifactPlanSchema,
        behaviorSchema,
        evidenceSchema,
        manifestSchema,
        angularManifest,
        reactManifest,
    ] = await Promise.all([
        computeWorkflowTargets(bundle.behavior),
        loadJson(paths.artifactPlanSchema),
        loadJson(paths.behaviorSchema),
        loadJson(paths.evidenceSchema),
        loadJson(paths.manifestSchema),
        loadJson(paths.angularManifest),
        loadJson(paths.reactManifest),
    ]);
    assert.deepEqual(
        validateJsonSchema(computed.artifactPlan, artifactPlanSchema),
        [],
        'workflow artifact plan violates its schema'
    );
    assert.deepEqual(validateJsonSchema(computed.model, behaviorSchema), []);
    assert.deepEqual(validateJsonSchema(bundle.evidence, evidenceSchema), []);
    for (const target of [computed.angular, computed.react]) {
        assert.deepEqual(
            validateJsonSchema(target.manifest, manifestSchema),
            []
        );
    }
    assert.deepEqual(
        computed.angular.manifest,
        angularManifest,
        'Angular workflow manifest drifted'
    );
    assert.deepEqual(
        computed.react.manifest,
        reactManifest,
        'ReactJS workflow manifest drifted'
    );
    assert.equal(
        computed.angular.manifest.input.sha256,
        computed.react.manifest.input.sha256
    );
    return computed;
}

async function main() {
    const targets = await verifyWorkflowTargets();
    console.log('Workflow-action target rendering: OK');
    for (const [name, target] of Object.entries({
        angular: targets.angular,
        react: targets.react,
    })) {
        console.log(
            `  ${name}: ${target.manifest.files.length} files, tree sha256 ${target.manifest.tree_sha256}`
        );
    }
    console.log(
        `  shared input sha256: ${targets.angular.manifest.input.sha256}`
    );
}

if (
    process.argv[1] &&
    import.meta.url === pathToFileURL(process.argv[1]).href
) {
    await main();
}
