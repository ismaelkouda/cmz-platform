import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { buildGenerationManifest } from './core/generation-manifest.mjs';
import { canonicalizeRenderedLayers } from './core/canonicalize-generated.mjs';
import { buildArtifactPlan } from './core/artifact-plan.mjs';
import { typecheckGenerated } from './core/typecheck-generated.mjs';
import { renderAngularListQuery } from './renderers/angular-list-query-renderer.mjs';
import { renderReactListQuery } from './renderers/react-list-query-renderer.mjs';
import { renderAngularListQueryLayered } from './renderers/angular-list-query-layered-renderer.mjs';
import { expandProfileValue } from './renderers/shared.mjs';
import { typecheckLayeredTargets } from './renderers/typecheck-layered.mjs';
import { loadJson, repositoryRoot } from './validate-ir.mjs';

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const paths = {
    angularProfile: resolve(
        moduleDirectory,
        'profiles/angular-nx.profile.json'
    ),
    reactProfile: resolve(
        moduleDirectory,
        'profiles/react-typescript.profile.json'
    ),
    angularLayeredProfile: resolve(
        moduleDirectory,
        'profiles/angular-nx-layered.profile.json'
    ),
};

/**
 * Même construction que render-targets.mjs::layeredProfileView — dérive un
 * profil "vue par couche" (seul `id` change) sans dupliquer le fichier
 * JSON. C'est ce `id` que buildGenerationManifest grave dans
 * `target.profile_id`, exigé exactement par targetProfiles
 * (core/generation-change-set.mjs) pour les targetId `angular-domain`/
 * `angular-data` — déjà partagés avec action-request-layered, aucune
 * nouvelle entrée n'était donc nécessaire dans cette table.
 */
function layeredProfileView(baseProfile, layer) {
    return { ...baseProfile, id: `${baseProfile.id}-${layer}` };
}

export async function computeListQueryTargetsForSemantic(semantic) {
    const [angularProfile, reactProfile] = await Promise.all([
        loadJson(paths.angularProfile),
        loadJson(paths.reactProfile),
    ]);
    const artifactPlan = buildArtifactPlan(semantic, 'list-query-model');
    const angularRendered = renderAngularListQuery(
        semantic,
        artifactPlan,
        angularProfile
    );
    const reactRendered = renderReactListQuery(
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

export async function computeListQueryLayeredTargetsForSemantic(semantic) {
    const angularLayeredProfile = await loadJson(paths.angularLayeredProfile);
    const artifactPlan = buildArtifactPlan(semantic, 'list-query-model');
    const layered = await canonicalizeRenderedLayers(
        renderAngularListQueryLayered(
            semantic,
            artifactPlan,
            angularLayeredProfile
        )
    );
    const basePackageName = expandProfileValue(
        angularLayeredProfile.package_name,
        semantic,
        'package_name'
    );
    typecheckLayeredTargets(
        {
            domain: {
                packageName: `@cmz/${basePackageName}-domain`,
                files: layered.domain.files,
            },
            data: {
                packageName: `@cmz/${basePackageName}-data`,
                files: layered.data.files,
            },
        },
        angularLayeredProfile.id,
        repositoryRoot
    );
    return {
        artifactPlan,
        'angular-domain': {
            files: layered.domain.files,
            manifest: buildGenerationManifest(
                semantic,
                artifactPlan,
                layeredProfileView(angularLayeredProfile, 'domain'),
                layered.domain
            ),
        },
        'angular-data': {
            files: layered.data.files,
            manifest: buildGenerationManifest(
                semantic,
                artifactPlan,
                layeredProfileView(angularLayeredProfile, 'data'),
                layered.data
            ),
        },
    };
}

async function main() {
    const definitionPath = process.argv[2];
    if (!definitionPath) {
        throw new Error(
            'usage: node render-list-query-targets.mjs <definition.json>'
        );
    }
    const { compileListQueryDefinition } =
        await import('./core/list-query-authoring.mjs');
    const definition = await loadJson(resolve(definitionPath));
    const { semantic } = compileListQueryDefinition(definition, {
        sourceUri: definitionPath,
        sourceSha256: '0'.repeat(64),
    });
    const targets = await computeListQueryTargetsForSemantic(semantic);
    console.log('List-query target rendering: OK');
    for (const [name, target] of Object.entries({
        angular: targets.angular,
        react: targets.react,
    })) {
        console.log(
            `  ${name}: ${target.manifest.files.length} files, tree sha256 ${target.manifest.tree_sha256}`
        );
    }
}

if (
    process.argv[1] &&
    import.meta.url === pathToFileURL(process.argv[1]).href
) {
    await main();
}
