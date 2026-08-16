import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { buildGenerationManifest } from './core/generation-manifest.mjs';
import { buildArtifactPlan } from './core/artifact-plan.mjs';
import { typecheckGenerated } from './core/typecheck-generated.mjs';
import { renderAngularNx } from './renderers/angular-nx-renderer.mjs';
import { renderReactTypescript } from './renderers/react-typescript-renderer.mjs';
import {
    loadJson,
    repositoryRoot,
    validateJsonSchema,
} from './validate-ir.mjs';

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const paths = {
    angularManifest: resolve(
        moduleDirectory,
        'manifests/angular-nx.manifest.json'
    ),
    artifactPlanSchema: resolve(
        moduleDirectory,
        'schemas/artifact-plan.schema.json'
    ),
    angularProfile: resolve(
        moduleDirectory,
        'profiles/angular-nx.profile.json'
    ),
    manifestSchema: resolve(
        moduleDirectory,
        'schemas/generation-manifest.schema.json'
    ),
    reactManifest: resolve(
        moduleDirectory,
        'manifests/react-typescript.manifest.json'
    ),
    reactProfile: resolve(
        moduleDirectory,
        'profiles/react-typescript.profile.json'
    ),
    semantic: resolve(moduleDirectory, 'fixtures/action-request.semantic.json'),
};

export async function computeTargetsForSemantic(semantic) {
    const [angularProfile, reactProfile] = await Promise.all([
        loadJson(paths.angularProfile),
        loadJson(paths.reactProfile),
    ]);
    const artifactPlan = buildArtifactPlan(semantic, 'semantic-model');
    const angularRendered = renderAngularNx(
        semantic,
        artifactPlan,
        angularProfile
    );
    const reactRendered = renderReactTypescript(
        semantic,
        artifactPlan,
        reactProfile
    );
    typecheckGenerated(
        angularRendered.files,
        angularProfile.id,
        repositoryRoot
    );
    typecheckGenerated(reactRendered.files, reactProfile.id, repositoryRoot);
    return {
        artifactPlan,
        angular: {
            files: angularRendered.files,
            manifest: buildGenerationManifest(
                semantic,
                artifactPlan,
                angularProfile,
                angularRendered
            ),
        },
        react: {
            files: reactRendered.files,
            manifest: buildGenerationManifest(
                semantic,
                artifactPlan,
                reactProfile,
                reactRendered
            ),
        },
    };
}

export async function computeTargets() {
    return computeTargetsForSemantic(await loadJson(paths.semantic));
}

export async function verifyTargets() {
    const [
        computed,
        artifactPlanSchema,
        schema,
        angularManifest,
        reactManifest,
    ] = await Promise.all([
        computeTargets(),
        loadJson(paths.artifactPlanSchema),
        loadJson(paths.manifestSchema),
        loadJson(paths.angularManifest),
        loadJson(paths.reactManifest),
    ]);
    assert.deepEqual(
        validateJsonSchema(computed.artifactPlan, artifactPlanSchema),
        [],
        'artifact plan violates its schema'
    );
    for (const [name, target] of Object.entries({
        angular: computed.angular,
        react: computed.react,
    })) {
        assert.deepEqual(
            validateJsonSchema(target.manifest, schema),
            [],
            `${name} manifest violates its schema`
        );
    }
    assert.deepEqual(
        computed.angular.manifest,
        angularManifest,
        'Angular/Nx generation manifest drifted'
    );
    assert.deepEqual(
        computed.react.manifest,
        reactManifest,
        'ReactJS generation manifest drifted'
    );
    assert.equal(
        computed.angular.manifest.input.sha256,
        computed.react.manifest.input.sha256,
        'renderers did not consume the same semantic input'
    );
    return computed;
}

async function main() {
    const targets = await verifyTargets();
    console.log('Generator platform target rendering: OK');
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
