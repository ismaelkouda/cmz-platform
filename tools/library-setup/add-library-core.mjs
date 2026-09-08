import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
    chmodSync,
    existsSync,
    lstatSync,
    mkdtempSync,
    mkdirSync,
    readFileSync,
    realpathSync,
    rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';

import {
    detectAppPlatform,
    validateRecipes,
    verifyApps,
} from '../check-library-setup.mjs';
import {
    createCandidateLease,
    releaseCandidateLease,
} from './candidate-lease.mjs';
import {
    selectCompatibilityTrack,
    validateCompatibilityMatrices,
} from './compatibility.mjs';
import { gitBlobOid } from './git-tree.mjs';
import {
    resolveLibraryDependencies,
    synchronizePublishedDependencies,
} from './install-protocol.mjs';
import { buildLibraryChangeSet, buildLibraryPlan } from './library-plan.mjs';
import {
    executeBoundedLlm,
    validateLlmProcessAdapter,
} from './llm-execution.mjs';
import {
    assertPublishableRepository,
    createCandidateCommit,
    publishCandidateCommit,
    recoverLibraryPublication,
} from './publication-transaction.mjs';
import {
    addLibraryManifestEntry,
    executeLibraryRecipe,
} from './recipe-execution.mjs';
import {
    loadResolutionPolicy,
    resolutionPolicySha256,
} from './resolution-policy.mjs';
import { proveLibraryRuntime, requiredAcceptances } from './runtime-proofs.mjs';
import { provisionBrowser } from './browser-provisioning.mjs';
import { selectSandboxBackend } from './sandbox.mjs';
import { snapshotFilesystem, snapshotSha256 } from './filesystem-snapshot.mjs';
import {
    compatibilityTrackDigest,
    libraryRunnerDigest,
} from './tooling-fingerprint.mjs';

function fail(message) {
    throw new Error(`add-library: ${message}`);
}

function assertIdentifier(value, label) {
    if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value ?? '')) {
        fail(`${label} exige un identifiant kebab-case`);
    }
}

function sha256(content) {
    return createHash('sha256').update(content).digest('hex');
}

function fileHash(root, path) {
    const absolute = join(root, path);
    const stats = lstatSync(absolute);
    if (stats.isSymbolicLink() || !stats.isFile()) fail(`${path} non régulier`);
    return sha256(readFileSync(absolute));
}

function ensureCache() {
    const parent = realpathSync(tmpdir());
    const cache = join(parent, 'cmz-library-bun-cache-v1');
    if (!existsSync(cache)) {
        mkdirSync(cache, { mode: 0o700 });
        chmodSync(cache, 0o700);
    }
    const stats = lstatSync(cache);
    if (
        stats.isSymbolicLink() ||
        !stats.isDirectory() ||
        realpathSync(cache) !== cache ||
        (stats.mode & 0o777) !== 0o700 ||
        (typeof process.getuid === 'function' && stats.uid !== process.getuid())
    ) {
        fail(
            'cache Bun non canonique, mauvais propriétaire ou mauvaises permissions'
        );
    }
    return cache;
}

function withSynchronizationHome(operation) {
    const home = mkdtempSync(
        join(realpathSync(tmpdir()), 'cmz-library-sync-home-')
    );
    chmodSync(home, 0o700);
    try {
        return operation(home);
    } finally {
        rmSync(home, { recursive: true, force: true });
    }
}

function requireSynchronization(operation) {
    const result = operation();
    if (!result || typeof result !== 'object' || result.synchronized !== true) {
        fail('la synchronisation locale n’a pas produit sa preuve de succès');
    }
    return result;
}

function workspaceVersions(manifest, platform) {
    const exact = (value, label) => {
        const match = /^(?:v)?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)$/.exec(
            value ?? ''
        );
        if (!match) fail(`${label} n'est pas une version exacte`);
        return match[1];
    };
    const versions = {
        node: exact(process.versions.node, 'Node'),
        bun: exact(
            manifest.packageManager?.replace(/^bun@/, ''),
            'packageManager Bun'
        ),
        nx: exact(manifest.devDependencies?.nx, 'Nx'),
    };
    if (platform === 'angular') {
        versions.angular = exact(
            manifest.workspaces?.catalog?.['@angular/core'],
            'Angular'
        );
    } else if (platform === 'react') {
        versions.react = exact(
            manifest.workspaces?.catalog?.react ??
                manifest.devDependencies?.react,
            'React'
        );
    } else {
        fail(`plateforme non prise en charge : ${platform}`);
    }
    return versions;
}

function installedLibraries(workspace, app, platform) {
    const path = join(workspace, 'apps', app, '.cmz', 'libraries.json');
    const stats = lstatSync(path);
    if (stats.isSymbolicLink() || !stats.isFile()) {
        fail(`manifeste de ${app} non régulier`);
    }
    const manifest = JSON.parse(readFileSync(path, 'utf8'));
    if (
        manifest.schema_version !== '1.0.0' ||
        manifest.kind !== 'app-library-manifest' ||
        manifest.platform !== platform ||
        !Array.isArray(manifest.libraries) ||
        manifest.libraries.some((entry) => typeof entry !== 'string')
    ) {
        fail(`manifeste de ${app} invalide`);
    }
    return [...manifest.libraries];
}

function governedSnapshot(workspace) {
    return snapshotFilesystem(workspace, {
        excludedDirectories: ['node_modules'],
    });
}

function recipePath(recipe) {
    return `conventions/libraries/${recipe.platform}/${recipe.library}.setup.json`;
}

function compatibilityPath(recipe) {
    return `conventions/libraries/${recipe.platform}/${recipe.library}.compat.json`;
}

function planInputs({
    root,
    candidate,
    app,
    recipe,
    track,
    dependencyResult,
    changeSet,
    versions,
    llmResult,
}) {
    const before = governedSnapshotFromTree(candidate.tree);
    const appPrefix = `apps/${app}/`;
    const appEntries = before.filter(({ path }) => path.startsWith(appPrefix));
    return {
        app,
        library: recipe.library,
        platform: recipe.platform,
        commit: candidate.tree.commit,
        recipe_sha256: fileHash(root, recipePath(recipe)),
        recipe_schema_sha256: fileHash(
            root,
            'conventions/libraries/library-setup.schema.json'
        ),
        policy_sha256: resolutionPolicySha256(root),
        policy_schema_sha256: fileHash(
            root,
            'conventions/libraries/resolution-policy.schema.json'
        ),
        compat_sha256: fileHash(root, compatibilityPath(recipe)),
        compat_schema_sha256: fileHash(
            root,
            'conventions/libraries/library-compat.schema.json'
        ),
        runner_sha256: libraryRunnerDigest(root),
        nx_json_sha256: fileHash(root, 'nx.json'),
        tsconfig_sha256: fileHash(root, 'tsconfig.base.json'),
        gitattributes_sha256: fileHash(root, '.gitattributes'),
        app_tree_sha256: snapshotSha256(appEntries),
        package_json_initial_oid: gitBlobOid(
            dependencyResult.packageJsonInitial,
            candidate.tree.objectFormat
        ),
        package_json_final_oid: gitBlobOid(
            dependencyResult.packageJsonFinal,
            candidate.tree.objectFormat
        ),
        bun_lock_initial_oid: gitBlobOid(
            dependencyResult.bunLockInitial,
            candidate.tree.objectFormat
        ),
        bun_lock_final_oid: gitBlobOid(
            dependencyResult.bunLockFinal,
            candidate.tree.objectFormat
        ),
        dependency_initial_sha256: dependencyResult.dependencyInitialSha256,
        dependency_final_sha256: dependencyResult.dependencyFinalSha256,
        node_version: versions.node,
        bun_version: dependencyResult.bunVersion,
        nx_version: versions.nx,
        framework_version: versions[recipe.platform],
        schematic_version: Object.entries(track.packages)
            .sort()
            .map(([name, version]) => `${name}@${version}`)
            .join(','),
        change_set_id: changeSet.change_set_id,
        ...(llmResult ? { llm_audit_sha256: llmResult.auditSha256 } : {}),
    };
}

function governedSnapshotFromTree(tree) {
    return tree.entries.map((entry) => ({
        path: entry.path,
        mode: entry.mode,
        bytes: entry.content.length,
        sha256: sha256(entry.content),
    }));
}

export function loadLibraryConfiguration(
    root,
    app,
    library,
    { requiredTrackStatus = 'verified' } = {}
) {
    const recipeResult = validateRecipes(root);
    if (!recipeResult.ok) fail(recipeResult.errors.join(' ; '));
    const initialApps = verifyApps(root, recipeResult.recipes);
    if (!initialApps.ok) {
        fail(`gate applicative initiale : ${initialApps.errors.join(' ; ')}`);
    }
    const compatibility = validateCompatibilityMatrices(
        root,
        recipeResult.recipes
    );
    if (!compatibility.ok) fail(compatibility.errors.join(' ; '));
    const { policy, errors: policyErrors } = loadResolutionPolicy(root);
    if (policyErrors.length) fail(policyErrors.join(' ; '));
    const platform = detectAppPlatform(join(root, 'apps', app));
    if (!platform || platform === 'unknown') {
        fail(`plateforme Nx indéterminée pour apps/${app}`);
    }
    const key = `${platform}/${library}`;
    const sourceRecipe = recipeResult.recipes.get(key);
    if (!sourceRecipe) fail(`recette absente : ${key}`);
    const recipe = structuredClone(sourceRecipe);
    const manifest = JSON.parse(
        readFileSync(join(root, 'package.json'), 'utf8')
    );
    const versions = workspaceVersions(manifest, platform);
    const track = selectCompatibilityTrack(
        compatibility.matrices.get(key),
        {
            node: versions.node,
            bun: versions.bun,
            nx: versions.nx,
            framework: versions[platform],
        },
        { requiredStatus: requiredTrackStatus }
    );
    return {
        platform,
        recipe,
        track: structuredClone(track),
        policy,
        versions,
    };
}

async function executeLibraryAddition({
    repository,
    app,
    library,
    dryRun = false,
    expectPlan,
    llmAdapter,
    runtimeProver = proveLibraryRuntime,
    onProgress = () => undefined,
    requiredTrackStatus,
    dependencySynchronizer = synchronizePublishedDependencies,
}) {
    assertIdentifier(app, 'app');
    assertIdentifier(library, 'library');
    if (typeof onProgress !== 'function')
        fail('onProgress doit être une fonction');
    const root = resolve(repository);
    const totalSteps = dryRun ? 8 : 9;
    onProgress({ step: 1, total: totalSteps, id: 'preconditions' });
    const cache = ensureCache();
    const bunExecutable = realpathSync(
        execFileSync('which', ['bun'], { encoding: 'utf8' }).trim()
    );
    const finalizePendingPublication = (descriptor) => {
        const configuration = loadLibraryConfiguration(
            root,
            descriptor.app,
            descriptor.library,
            { requiredTrackStatus: 'verified' }
        );
        if (
            configuration.platform !== descriptor.platform ||
            configuration.track.id !== descriptor.track_id ||
            compatibilityTrackDigest(configuration.track) !==
                descriptor.track_sha256
        ) {
            fail(
                'la piste publiée ne correspond plus à la finalisation journalisée'
            );
        }
        return withSynchronizationHome((home) =>
            requireSynchronization(() =>
                dependencySynchronizer({
                    repository: root,
                    track: configuration.track,
                    policy: configuration.policy,
                    cache,
                    home,
                    bunExecutable,
                })
            )
        );
    };
    const recovery = recoverLibraryPublication(root, {
        finalizePublishedState: finalizePendingPublication,
    });
    if (
        recovery.action === 'completed-post-publish' &&
        recovery.postPublish.app === app &&
        recovery.postPublish.library === library
    ) {
        return {
            recovered: true,
            published: true,
            recovery: {
                plan_id: recovery.planId,
                commit: recovery.commit,
                branch: recovery.branch,
            },
            dependencySynchronization: recovery.postPublishResult,
        };
    }
    const head = execFileSync(
        'git',
        ['-C', root, 'rev-parse', '--verify', 'HEAD'],
        {
            encoding: 'utf8',
        }
    ).trim();
    assertPublishableRepository(root, head);
    onProgress({ step: 2, total: totalSteps, id: 'contracts' });
    const { platform, recipe, track, policy, versions } =
        loadLibraryConfiguration(root, app, library, {
            requiredTrackStatus,
        });
    if (recipe.install.method === 'llm-then-verified') {
        try {
            validateLlmProcessAdapter(llmAdapter);
        } catch (error) {
            fail(`recette LLM refusée avant candidat : ${error.message}`);
        }
    }
    const recipeResult = validateRecipes(root);
    const backend = selectSandboxBackend();
    let candidate;
    try {
        onProgress({ step: 3, total: totalSteps, id: 'candidate' });
        candidate = createCandidateLease({ repository: root, commit: head });
        const libraries = installedLibraries(
            candidate.workspace,
            app,
            platform
        );
        if (libraries.includes(library))
            fail(`${library} est déjà installée dans ${app}`);
        const before = governedSnapshotFromTree(candidate.tree);
        onProgress({ step: 4, total: totalSteps, id: 'dependencies' });
        const dependencyResult = await resolveLibraryDependencies({
            repository: root,
            candidate,
            track,
            policy,
            backend,
            cache,
            homes: candidate.homes,
            bunExecutable,
        });
        // Le moteur de rendu est approvisionné PENDANT la phase de résolution,
        // seule phase où le réseau est ouvert, et uniquement si une acceptance
        // déclarée en a besoin. L'archive est vérifiée par empreinte avant
        // extraction ; ensuite il n'est plus monté qu'en lecture.
        const browser = requiredAcceptances(
            recipe,
            libraries,
            recipeResult.recipes
        ).some((entry) => entry.proof === 'browser-coexistence')
            ? await provisionBrowser({
                  policy,
                  backend,
                  extractionRoot: join(candidate.resources, 'browser'),
              })
            : undefined;
        const runtimeOptions = {
            repository: root,
            candidate,
            recipe,
            app,
            policy,
            backend,
            cache,
            home: candidate.homes.execution,
            installedLibraries: libraries,
            recipeRegistry: recipeResult.recipes,
            browserExecutable: browser?.executable,
            browserRoot: browser?.root,
        };
        onProgress({ step: 5, total: totalSteps, id: 'recipe' });
        let llmResult;
        if (recipe.install.method === 'llm-then-verified') {
            addLibraryManifestEntry(
                candidate.workspace,
                app,
                recipe.platform,
                recipe.library
            );
            llmResult = await executeBoundedLlm({
                repository: root,
                candidate,
                recipe,
                app,
                installedLibraries: libraries,
                adapter: llmAdapter,
                verify: () => {
                    const appCheck = verifyApps(
                        candidate.workspace,
                        recipeResult.recipes
                    );
                    if (!appCheck.ok) {
                        return { ok: false, failures: appCheck.errors };
                    }
                    try {
                        runtimeProver(runtimeOptions);
                        return { ok: true, failures: [] };
                    } catch (error) {
                        return { ok: false, failures: [error.message] };
                    }
                },
            });
        } else {
            executeLibraryRecipe({
                repository: root,
                candidate,
                recipe,
                track,
                app,
                policy,
                backend,
                cache,
                home: candidate.homes.execution,
            });
        }
        onProgress({ step: 6, total: totalSteps, id: 'runtime-proofs' });
        // Même après une boucle LLM réussie, les preuves sont rejouées une fois
        // et leur résultat explicite devient une sortie gouvernée. Une simple
        // affirmation de l'adaptateur ne peut donc jamais tenir lieu de preuve.
        const runtimeResult = runtimeProver(runtimeOptions);
        const appCheck = verifyApps(candidate.workspace, recipeResult.recipes);
        if (!appCheck.ok)
            fail(`gate applicative candidate : ${appCheck.errors.join(' ; ')}`);
        const after = governedSnapshot(candidate.workspace);
        const changeSet = buildLibraryChangeSet(before, after);
        onProgress({ step: 7, total: totalSteps, id: 'plan' });
        const plan = buildLibraryPlan(
            planInputs({
                root,
                candidate,
                app,
                recipe,
                track,
                dependencyResult,
                changeSet,
                versions,
                llmResult,
            })
        );
        if (expectPlan && expectPlan !== plan.plan_id) {
            fail(`plan attendu ${expectPlan}, obtenu ${plan.plan_id}`);
        }
        if (dryRun) {
            onProgress({ step: 8, total: totalSteps, id: 'dry-run-complete' });
            return {
                plan,
                changeSet,
                runtimeProofs: [...runtimeResult.proofs],
                ...(llmResult
                    ? {
                          llmAudit: {
                              path: relative(root, llmResult.auditPath),
                              sha256: llmResult.auditSha256,
                          },
                      }
                    : {}),
                published: false,
            };
        }
        onProgress({ step: 8, total: totalSteps, id: 'publication' });
        const commit = createCandidateCommit({
            repository: root,
            candidate: candidate.workspace,
            baseCommit: head,
            changeSet,
            message: `chore(${app}): add ${library}`,
        });
        const postPublish = {
            kind: 'dependency-synchronization',
            app,
            library,
            platform,
            track_id: track.id,
            track_sha256: compatibilityTrackDigest(track),
        };
        const publication = publishCandidateCommit({
            repository: root,
            candidate: candidate.workspace,
            baseCommit: head,
            candidateCommit: commit.commit,
            changeSet,
            planId: plan.plan_id,
            postPublish,
            finalizePublishedState: () => {
                onProgress({
                    step: 9,
                    total: totalSteps,
                    id: 'dependency-synchronization',
                });
                return requireSynchronization(() =>
                    dependencySynchronizer({
                        repository: root,
                        track,
                        policy,
                        cache,
                        home: candidate.homes.verification,
                        bunExecutable,
                    })
                );
            },
        });
        const dependencySynchronization = publication.postPublishResult;
        return {
            plan,
            changeSet,
            runtimeProofs: [...runtimeResult.proofs],
            ...(llmResult
                ? {
                      llmAudit: {
                          path: relative(root, llmResult.auditPath),
                          sha256: llmResult.auditSha256,
                      },
                  }
                : {}),
            publication,
            dependencySynchronization,
            published: true,
        };
    } finally {
        if (candidate) releaseCandidateLease(candidate);
    }
}

/** Chemin produit : une piste candidate n'est jamais consommable. */
export function addLibrary(options) {
    return executeLibraryAddition({
        ...options,
        requiredTrackStatus: 'verified',
    });
}

/**
 * Chemin de qualification interne. Il n'est exposé par aucune option de la CLI
 * add-library et ne publie jamais : la promotion consomme son dry-run prouvé.
 */
export function executeCandidateLibraryForPromotion(options) {
    return executeLibraryAddition({
        ...options,
        dryRun: true,
        expectPlan: undefined,
        requiredTrackStatus: 'candidate',
    });
}
