import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { buildArtifactPlan } from './core/artifact-plan.mjs';
import { buildGenerationManifest } from './core/generation-manifest.mjs';
import { renderAngularNx } from './renderers/angular-nx-renderer.mjs';
import { renderReactTypescript } from './renderers/react-typescript-renderer.mjs';
import { verifyTargets } from './render-targets.mjs';
import { loadJson } from './validate-ir.mjs';

const root = new URL('./', import.meta.url);

async function inputs() {
    const [semantic, angularProfile, reactProfile] = await Promise.all([
        loadJson(new URL('fixtures/action-request.semantic.json', root)),
        loadJson(new URL('profiles/angular-nx.profile.json', root)),
        loadJson(new URL('profiles/react-typescript.profile.json', root)),
    ]);
    return [
        semantic,
        buildArtifactPlan(semantic, 'semantic-model'),
        angularProfile,
        reactProfile,
    ];
}

test('both target renderers compile and match their persisted manifests', async () => {
    const targets = await verifyTargets();
    assert.equal(targets.angular.manifest.files.length, 9);
    assert.equal(targets.react.manifest.files.length, 9);
    assert.equal(
        targets.angular.manifest.input.sha256,
        targets.react.manifest.input.sha256
    );
});

test('rendering is deterministic for identical IR and profiles', async () => {
    const [semantic, artifactPlan, angularProfile, reactProfile] =
        await inputs();
    assert.deepEqual(
        renderAngularNx(semantic, artifactPlan, angularProfile),
        renderAngularNx(
            structuredClone(semantic),
            structuredClone(artifactPlan),
            structuredClone(angularProfile)
        )
    );
    assert.deepEqual(
        renderReactTypescript(semantic, artifactPlan, reactProfile),
        renderReactTypescript(
            structuredClone(semantic),
            structuredClone(artifactPlan),
            structuredClone(reactProfile)
        )
    );
});

test('a semantic endpoint mutation invalidates both manifests', async () => {
    const [semantic, artifactPlan, angularProfile, reactProfile] =
        await inputs();
    const originalAngular = buildGenerationManifest(
        semantic,
        artifactPlan,
        angularProfile,
        renderAngularNx(semantic, artifactPlan, angularProfile)
    );
    const originalReact = buildGenerationManifest(
        semantic,
        artifactPlan,
        reactProfile,
        renderReactTypescript(semantic, artifactPlan, reactProfile)
    );
    semantic.integrations[0].path = 'login-v2';
    const mutatedPlan = buildArtifactPlan(semantic, 'semantic-model');
    const mutatedAngular = buildGenerationManifest(
        semantic,
        mutatedPlan,
        angularProfile,
        renderAngularNx(semantic, mutatedPlan, angularProfile)
    );
    const mutatedReact = buildGenerationManifest(
        semantic,
        mutatedPlan,
        reactProfile,
        renderReactTypescript(semantic, mutatedPlan, reactProfile)
    );
    assert.notEqual(mutatedAngular.input.sha256, originalAngular.input.sha256);
    assert.notEqual(mutatedReact.input.sha256, originalReact.input.sha256);
    assert.notEqual(mutatedAngular.tree_sha256, originalAngular.tree_sha256);
    assert.notEqual(mutatedReact.tree_sha256, originalReact.tree_sha256);
});

test('a profile-only mutation invalidates the profile hash', async () => {
    const [semantic, artifactPlan, angularProfile] = await inputs();
    const rendered = renderAngularNx(semantic, artifactPlan, angularProfile);
    const original = buildGenerationManifest(
        semantic,
        artifactPlan,
        angularProfile,
        rendered
    );
    angularProfile.runtime_contract = `${angularProfile.runtime_contract} v2`;
    const mutated = buildGenerationManifest(
        semantic,
        artifactPlan,
        angularProfile,
        rendered
    );
    assert.notEqual(
        mutated.target.profile_sha256,
        original.target.profile_sha256
    );
    assert.equal(mutated.tree_sha256, original.tree_sha256);
});

test('manifest construction rejects path traversal', async () => {
    const [semantic, artifactPlan, angularProfile] = await inputs();
    assert.throws(
        () =>
            buildGenerationManifest(semantic, artifactPlan, angularProfile, {
                files: { '../outside.ts': 'export {};' },
                artifacts: [
                    {
                        path: '../outside.ts',
                        artifact_id: 'domain-model',
                    },
                ],
            }),
        /unsafe output path/
    );
});

test('renderers reject a mismatched target profile', async () => {
    const [semantic, artifactPlan, angularProfile, reactProfile] =
        await inputs();
    assert.throws(
        () => renderAngularNx(semantic, artifactPlan, reactProfile),
        /received profile react-typescript/
    );
    assert.throws(
        () => renderReactTypescript(semantic, artifactPlan, angularProfile),
        /received profile angular-nx/
    );
});

test('renderer implementations do not import adapters or source fixtures', async () => {
    const implementations = await Promise.all([
        readFile(new URL('renderers/angular-nx-renderer.mjs', root), 'utf8'),
        readFile(
            new URL('renderers/react-typescript-renderer.mjs', root),
            'utf8'
        ),
        readFile(new URL('renderers/shared.mjs', root), 'utf8'),
    ]);
    for (const implementation of implementations) {
        assert.doesNotMatch(
            implementation,
            /from ['"]\.\.\/(?:adapters|sources|fixtures)/
        );
        assert.doesNotMatch(
            implementation,
            /action-request\.spec|\.evidence\.json/
        );
    }
});

test('shared target-neutral files have identical content hashes', async () => {
    const targets = await verifyTargets();
    const angularFiles = new Map(
        targets.angular.manifest.files.map((file) => [file.path, file.sha256])
    );
    const reactFiles = new Map(
        targets.react.manifest.files.map((file) => [file.path, file.sha256])
    );
    assert.equal(
        angularFiles.get('src/models.ts'),
        reactFiles.get('src/models.ts')
    );
    assert.equal(
        angularFiles.get('src/validation.ts'),
        reactFiles.get('src/validation.ts')
    );
});
