import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { buildGenerationManifest } from './core/generation-manifest.mjs';
import { canonicalizeRenderedLayers } from './core/canonicalize-generated.mjs';
import { buildArtifactPlan } from './core/artifact-plan.mjs';
import { typecheckGenerated } from './core/typecheck-generated.mjs';
import { renderAngularNx } from './renderers/angular-nx-renderer.mjs';
import {
    applicationPackageName,
    dataPackageName,
    domainPackageName,
    renderAngularNxLayered,
} from './renderers/angular-nx-layered-renderer.mjs';
import { renderReactTypescript } from './renderers/react-typescript-renderer.mjs';
import {
    applicationPackageName as reactApplicationPackageName,
    dataPackageName as reactDataPackageName,
    domainPackageName as reactDomainPackageName,
    renderReactTypescriptLayered,
} from './renderers/react-typescript-layered-renderer.mjs';
import { expandProfileValue } from './renderers/shared.mjs';
import {
    assertNoApplicationToDataImport,
    typecheckLayeredTargets,
} from './renderers/typecheck-layered.mjs';
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
    angularLayeredProfile: resolve(
        moduleDirectory,
        'profiles/angular-nx-layered.profile.json'
    ),
    reactLayeredProfile: resolve(
        moduleDirectory,
        'profiles/react-typescript-layered.profile.json'
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

/**
 * Étape 3 (additive) du chantier « générateur en couches » (ADR-0003 §5d).
 *
 * `layeredProfileView(baseProfile, layer)` dérive, sans dupliquer le
 * fichier JSON, un profil "vue par couche" dont seul `id` change
 * (suffixé par couche) — c'est ce `id` que buildGenerationManifest grave
 * dans `target.profile_id`, et que core/generation-change-set.mjs
 * (targetProfiles) exige exactement pour chaque target en couches
 * (angular-domain -> angular-nx-layered-domain, etc.). Le reste du
 * profil (package_name, output_root, external_dependencies) est
 * partagé : les 3 couches sont des vues d'un seul profil de
 * configuration, pas 3 profils indépendants à maintenir.
 */
function layeredProfileView(baseProfile, layer) {
    return { ...baseProfile, id: `${baseProfile.id}-${layer}` };
}

export async function computeTargetsForSemantic(semantic) {
    const [
        angularProfile,
        reactProfile,
        angularLayeredProfile,
        reactLayeredProfile,
    ] = await Promise.all([
        loadJson(paths.angularProfile),
        loadJson(paths.reactProfile),
        loadJson(paths.angularLayeredProfile),
        loadJson(paths.reactLayeredProfile),
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

    // Sortie Angular en couches — additive, calculée en plus de la sortie
    // plate ci-dessus, jamais à sa place. N'affecte ni angularRendered ni
    // reactRendered : computed.angular/computed.react restent identiques
    // bit-à-bit à avant cette étape (voir render-targets.test au besoin,
    // et les tree sha256 déjà vérifiés inchangés par ailleurs).
    const angularLayered = await canonicalizeRenderedLayers(
        renderAngularNxLayered(semantic, artifactPlan, angularLayeredProfile)
    );
    // basePackageName expansé une seule fois ici, avec la même règle
    // d'expansion (expandProfileValue) que celle appliquée en interne par
    // renderAngularNxLayered sur ce même profil — les noms de package
    // utilisés pour le type-check doivent être ceux réellement émis dans
    // les fichiers générés (imports inter-package), pas une supposition
    // indépendante.
    const layeredBasePackageName = expandProfileValue(
        angularLayeredProfile.package_name,
        semantic,
        'package_name'
    );
    const layeredDataPackageName = dataPackageName(layeredBasePackageName);
    assertNoApplicationToDataImport(angularLayered, layeredDataPackageName);
    typecheckLayeredTargets(
        {
            domain: {
                packageName: domainPackageName(layeredBasePackageName),
                files: angularLayered.domain.files,
            },
            data: {
                packageName: layeredDataPackageName,
                files: angularLayered.data.files,
            },
            application: {
                packageName: applicationPackageName(layeredBasePackageName),
                files: angularLayered.application.files,
            },
        },
        angularLayeredProfile.id,
        repositoryRoot
    );

    // Sortie React en couches — même traitement additif, symétrique du
    // bloc Angular ci-dessus. N'affecte ni angularRendered ni
    // reactRendered.
    const reactLayered = renderReactTypescriptLayered(
        semantic,
        artifactPlan,
        reactLayeredProfile
    );
    const reactLayeredBasePackageName = expandProfileValue(
        reactLayeredProfile.package_name,
        semantic,
        'package_name'
    );
    const reactLayeredDataPackageName = reactDataPackageName(
        reactLayeredBasePackageName
    );
    assertNoApplicationToDataImport(reactLayered, reactLayeredDataPackageName);
    typecheckLayeredTargets(
        {
            domain: {
                packageName: reactDomainPackageName(
                    reactLayeredBasePackageName
                ),
                files: reactLayered.domain.files,
            },
            data: {
                packageName: reactLayeredDataPackageName,
                files: reactLayered.data.files,
            },
            application: {
                packageName: reactApplicationPackageName(
                    reactLayeredBasePackageName
                ),
                files: reactLayered.application.files,
            },
        },
        reactLayeredProfile.id,
        repositoryRoot
    );

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
        'angular-domain': {
            files: angularLayered.domain.files,
            manifest: buildGenerationManifest(
                semantic,
                artifactPlan,
                layeredProfileView(angularLayeredProfile, 'domain'),
                angularLayered.domain
            ),
        },
        'angular-data': {
            files: angularLayered.data.files,
            manifest: buildGenerationManifest(
                semantic,
                artifactPlan,
                layeredProfileView(angularLayeredProfile, 'data'),
                angularLayered.data
            ),
        },
        'angular-application': {
            files: angularLayered.application.files,
            manifest: buildGenerationManifest(
                semantic,
                artifactPlan,
                layeredProfileView(angularLayeredProfile, 'application'),
                angularLayered.application
            ),
        },
        'react-domain': {
            files: reactLayered.domain.files,
            manifest: buildGenerationManifest(
                semantic,
                artifactPlan,
                layeredProfileView(reactLayeredProfile, 'domain'),
                reactLayered.domain
            ),
        },
        'react-data': {
            files: reactLayered.data.files,
            manifest: buildGenerationManifest(
                semantic,
                artifactPlan,
                layeredProfileView(reactLayeredProfile, 'data'),
                reactLayered.data
            ),
        },
        'react-application': {
            files: reactLayered.application.files,
            manifest: buildGenerationManifest(
                semantic,
                artifactPlan,
                layeredProfileView(reactLayeredProfile, 'application'),
                reactLayered.application
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
