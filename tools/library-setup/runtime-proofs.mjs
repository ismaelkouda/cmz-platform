import { snapshotFilesystem, snapshotSha256 } from './filesystem-snapshot.mjs';
import {
    assertMaterialTailwindCascade,
    proveMaterialTailwindCascade,
} from './runtime-oracles/material-tailwind-cascade.mjs';
import {
    assertBrowserCoexistence,
    browserProbeHtml,
    proveMaterialTailwindBrowser,
} from './runtime-oracles/material-tailwind-browser.mjs';
import { proveMaterialComponent } from './runtime-oracles/material-component.mjs';
import { proveProductionBuild } from './runtime-oracles/production-build.mjs';
import { buildAndClean } from './runtime-oracles/support.mjs';
import { proveTailwindSentinel } from './runtime-oracles/tailwind-sentinel.mjs';
import { proveTranslocoRender } from './runtime-oracles/transloco-render.mjs';
import { runConfined } from './sandbox.mjs';

export {
    assertBrowserCoexistence,
    assertMaterialTailwindCascade,
    browserProbeHtml,
};

function fail(message) {
    throw new Error(`library runtime proof: ${message}`);
}

/**
 * Un oracle par acceptance déclarée, adressé par
 * (plateforme, bibliothèque, id). Les implémentations sont isolées par fichier
 * afin qu'une évolution Transloco ne périme pas une qualification Material.
 */
const RUNTIME_ORACLES = new Map([
    [
        'angular/angular-material#material-component-compiles',
        proveMaterialComponent,
    ],
    ['angular/angular-material#offline-production-build', proveProductionBuild],
    ['angular/tailwind#sentinel-class-emits-rule', proveTailwindSentinel],
    ['angular/tailwind#offline-production-build', proveProductionBuild],
    ['angular/transloco#key-renders-translation', proveTranslocoRender],
    ['angular/transloco#offline-production-build', proveProductionBuild],
    [
        'angular/angular-material#material-tailwind-cascade-order',
        proveMaterialTailwindCascade,
    ],
    [
        'angular/angular-material#material-tailwind-render-together',
        proveMaterialTailwindBrowser,
    ],
]);

/** Clés lisibles par le gate statique, sans exécuter aucun oracle. */
export const RUNTIME_ORACLE_KEYS = new Set(RUNTIME_ORACLES.keys());

function acceptanceOwner(recipe, entry, scope) {
    return {
        ...entry,
        scope,
        ownerPlatform: recipe.platform,
        ownerLibrary: recipe.library,
    };
}

export function requiredAcceptances(
    recipe,
    installedLibraries = [],
    recipeRegistry = new Map()
) {
    const entries = (recipe.runtime_acceptance ?? []).map((entry) =>
        acceptanceOwner(recipe, entry, 'library')
    );
    for (const block of recipe.coexistence ?? []) {
        if (!installedLibraries.includes(block.with)) continue;
        for (const entry of block.runtime_acceptance ?? []) {
            entries.push(
                acceptanceOwner(recipe, entry, `coexistence:${block.with}`)
            );
        }
    }
    for (const installedLibrary of installedLibraries) {
        const installedRecipe = recipeRegistry.get(
            `${recipe.platform}/${installedLibrary}`
        );
        if (!installedRecipe) {
            fail(
                `recette installée absente du registre : ${recipe.platform}/${installedLibrary}`
            );
        }
        for (const block of installedRecipe.coexistence ?? []) {
            if (block.with !== recipe.library) continue;
            for (const entry of block.runtime_acceptance ?? []) {
                entries.push(
                    acceptanceOwner(
                        installedRecipe,
                        entry,
                        `coexistence:${recipe.library}`
                    )
                );
            }
        }
    }
    return entries;
}

export function proveLibraryRuntime({
    repository,
    candidate,
    recipe,
    app,
    policy,
    backend,
    cache,
    home,
    installedLibraries = [],
    browserExecutable,
    browserRoot,
    recipeRegistry = new Map(),
    run = runConfined,
}) {
    const before = snapshotFilesystem(candidate.workspace, {
        excludedDirectories: ['node_modules'],
    });
    const context = {
        repository,
        workspace: candidate.workspace,
        app,
        policy,
        backend,
        cache,
        home,
        browserExecutable,
        browserRoot,
        run,
    };
    const required = requiredAcceptances(
        recipe,
        installedLibraries,
        recipeRegistry
    );
    if (required.length === 0) {
        fail(
            `aucune acceptance runtime déclarée pour ${recipe.platform}/${recipe.library}`
        );
    }
    buildAndClean(context, app);
    const executed = [];
    for (const entry of required) {
        const key = `${entry.ownerPlatform}/${entry.ownerLibrary}#${entry.id}`;
        const oracle = RUNTIME_ORACLES.get(key);
        if (!oracle) {
            fail(
                `oracle runtime absent pour ${key} (preuve ${entry.proof}, ${entry.scope})`
            );
        }
        oracle(context);
        executed.push(entry.id);
    }
    const after = snapshotFilesystem(candidate.workspace, {
        excludedDirectories: ['node_modules'],
    });
    if (snapshotSha256(before) !== snapshotSha256(after)) {
        fail('les preuves runtime ont laissé des artefacts gouvernés');
    }
    return { proofs: executed };
}
