// ADR-0103 : seule voie pour changer l'inventaire d'une application extérieure.
// Même modèle que create-app : plan relu, verrou, candidat, binaires du
// produit, échange atomique, contrôles natifs et retour arrière exact.
import { readdir } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

import { EXTERNAL_WORKSPACE_CMZ } from '../renderers/application-workspace-renderer.mjs';
import {
    installedBin,
    qualifyProductInstallation,
    readOwnedWorkspace,
    runExternalApplicationCommand,
} from './application-workspace.mjs';
import {
    inputFilePath,
    ownedProductContext,
} from './application-workspace-root.mjs';
import {
    PUBLICATION_TOOLS,
    publishedManifest,
    verifyApplicationOwnership,
} from './application-ownership.mjs';
import { canonicalizeGeneratedFiles } from './canonicalize-generated.mjs';
import { repositoryRoot } from '../validate-ir.mjs';
import {
    assertSourceWeight,
    externalFailure,
    pathExists,
    readProductFile,
    stageGeneratedTree,
    treeInventory,
    verifyGeneratedTree,
} from './external-application-paths.mjs';
import { sha256, stableStringify } from './generation-manifest.mjs';
import {
    removeTreeAndSync,
    renameAndSync,
    withGenerationLock,
} from './generation-transaction.mjs';

const APP_MANIFEST = '.cmz/app-manifest.json';

function appLocation(options) {
    if (!/^[a-z][a-z0-9-]*$/.test(options.appName ?? ''))
        externalFailure('invalid app name');
    if (typeof options.targetRoot !== 'string')
        externalFailure('publication requires a target root');
    const apps = resolve(options.targetRoot, 'apps');
    return { apps, output: resolve(apps, options.appName) };
}

// Entrées du produit liées au plan (X2) : relues et comparées à chaque plan,
// donc aussi sous verrou. Une dérive périme la publication.
async function verifiedInputs(root, inputs) {
    if (!Array.isArray(inputs)) externalFailure('publication inputs invalid');
    const verified = [];
    for (const input of inputs) {
        if (
            !input ||
            typeof input.path !== 'string' ||
            !/^[a-f0-9]{64}$/.test(input.sha256 ?? '')
        )
            externalFailure('publication inputs invalid');
        const path = inputFilePath(input.path);
        if (sha256(await readProductFile(root, path)) !== input.sha256)
            externalFailure('publication input drift');
        verified.push({ path, sha256: input.sha256 });
    }
    verified.sort((left, right) => (left.path < right.path ? -1 : 1));
    if (
        verified.some(
            (entry, i) => i > 0 && verified[i - 1].path === entry.path
        )
    )
        externalFailure('publication inputs invalid');
    return verified;
}

// Un préfixe couvert (X2) est republié en entier : aucun fichier ancien sous
// ce préfixe ne peut rester sans être expliqué par la nouvelle sortie.
function assertCoveredPrefix(prefix, files, current) {
    if (prefix === undefined) return null;
    if (
        typeof prefix !== 'string' ||
        !/^src\/app\/generated\/[a-z0-9][a-z0-9._-]*(?:\/[a-z0-9][a-z0-9._-]*)*\/$/.test(
            prefix
        )
    )
        externalFailure('publication covered prefix is invalid');
    if (Object.keys(files).some((path) => !path.startsWith(prefix)))
        externalFailure('publication outside its covered prefix');
    for (const path of current.keys())
        if (path.startsWith(prefix) && !Object.hasOwn(files, path))
            externalFailure('publication would leave an unexplained file');
    return prefix;
}

async function currentApplication(workspace, appName) {
    const root = resolve(workspace.productRoot, 'apps', appName);
    if (!(await pathExists(root))) externalFailure('application is absent');
    const manifestBytes = await readProductFile(root, APP_MANIFEST);
    const manifest = JSON.parse(manifestBytes.toString('utf8'));
    const files = { [APP_MANIFEST]: manifestBytes.toString('utf8') };
    for (const entry of manifest.generated_files)
        files[entry.path] = (await readProductFile(root, entry.path)).toString(
            'utf8'
        );
    return { root, manifest, manifestBytes, files };
}

// `internal.recoveringApp` : seulement depuis la reprise sous verrou, pour
// tolérer les candidats de cette application (ADR-0103).
export async function planApplicationPublication(options, internal = {}) {
    const { output } = appLocation(options);
    if (!PUBLICATION_TOOLS.includes(options.tool))
        externalFailure('publication tool is not declared');
    const entries = Object.entries(options.files ?? {});
    if (
        entries.length === 0 ||
        entries.some(([, content]) => typeof content !== 'string')
    )
        externalFailure('publication requires file contents');
    const workspace = await readOwnedWorkspace(options, internal);
    const workspaceId = workspace.manifest.workspace_id;
    const installation = await qualifyProductInstallation(workspace);
    const app = await currentApplication(workspace, options.appName);
    const current = new Map(
        app.manifest.generated_files.map((entry) => [entry.path, entry])
    );
    const coveredPrefix = assertCoveredPrefix(
        options.coveredPrefix,
        options.files,
        current
    );
    const inputs = await verifiedInputs(
        workspace.productRoot,
        options.inputs ?? []
    );
    const changes = entries
        .filter(
            ([path, content]) =>
                !options.omitUnchanged ||
                current.get(path)?.sha256 !== sha256(content)
        )
        .map(([path, content]) => {
            const before = current.get(path);
            const change = {
                path,
                change: before ? 'replaced' : 'added',
                sha256: sha256(content),
                bytes: Buffer.byteLength(content),
            };
            if (before)
                change.before = { sha256: before.sha256, bytes: before.bytes };
            return change;
        })
        .sort((left, right) => (left.path < right.path ? -1 : 1));
    if (
        changes.length === 0 ||
        changes.some((entry) => entry.before?.sha256 === entry.sha256)
    )
        externalFailure('publication without change');
    const binding = {
        tools_root: workspace.toolsRoot,
        target_root: workspace.productRoot,
        workspace_plan_id: workspace.plan_id,
        provenance: workspace.provenance,
        lock_sha256: installation.lock_sha256,
        installed: installation.metadata,
        app_name: options.appName,
        app_manifest_sha256: sha256(app.manifestBytes),
        tool: options.tool,
        inputs,
        covered_prefix: coveredPrefix,
        changes,
    };
    const planId = sha256(stableStringify(binding));
    const record = { plan_id: planId, tool: options.tool, files: changes };
    const next = publishedManifest(app.manifest, record, workspaceId);
    const manifestPath = `apps/${options.appName}/${APP_MANIFEST}`;
    const manifestText = (
        await canonicalizeGeneratedFiles({
            [manifestPath]: JSON.stringify(next, null, 2) + '\n',
        })
    )[manifestPath];
    const files = { ...app.files, ...options.files };
    files[APP_MANIFEST] = manifestText;
    const candidateName = (kind) =>
        resolve(
            workspace.productRoot,
            'apps',
            `.${options.appName}.${kind}-candidate-${planId}`
        );
    return {
        plan_id: planId,
        app_name: options.appName,
        profile: app.manifest.profile,
        tool: options.tool,
        output: `apps/${options.appName}`,
        outputAbsolute: output,
        candidate: candidateName('publication'),
        previous: candidateName('previous'),
        root: workspace.productRoot,
        changes,
        inputs,
        manifest_sha256: sha256(manifestText),
        files,
        previousFiles: app.files,
        workspace,
        installation,
    };
}

export function publicApplicationPublicationPlan(plan) {
    return {
        schema_version: '1.0.0',
        plan_id: plan.plan_id,
        app_name: plan.app_name,
        tool: plan.tool,
        output: plan.output,
        inputs: plan.inputs,
        changes: plan.changes,
        manifest_sha256: plan.manifest_sha256,
    };
}

// Premier écart d'un arbre avec son propre manifeste, en chemin relatif à
// l'application (M-3) : la commande de reprise le nomme sans chemin local.
async function firstOwnedTreeDrift(root) {
    let manifest;
    try {
        manifest = JSON.parse(
            (await readProductFile(root, APP_MANIFEST)).toString('utf8')
        );
    } catch {
        return { path: APP_MANIFEST, kind: 'manifest' };
    }
    const expected = new Map(
        (manifest.generated_files ?? []).map((entry) => [entry.path, entry])
    );
    let actual;
    try {
        actual = await treeInventory(root);
    } catch {
        return { path: null, kind: 'entry' };
    }
    const present = new Set();
    for (const entry of actual) {
        if (entry.path === APP_MANIFEST) continue;
        const wanted = expected.get(entry.path);
        if (!wanted) return { path: entry.path, kind: 'unlisted' };
        present.add(entry.path);
        if (wanted.sha256 !== entry.sha256 || wanted.bytes !== entry.bytes)
            return { path: entry.path, kind: 'modified' };
    }
    for (const path of expected.keys())
        if (!present.has(path)) return { path, kind: 'missing' };
    return { path: null, kind: 'directory' };
}

function ambiguous(drift) {
    const error = new Error(
        'external application: ambiguous interrupted publication'
    );
    if (drift) error.drift = drift;
    throw error;
}

// Arbre complet et exact selon son propre manifeste, sinon rien n'est retiré.
// `tree` : nom de l'arbre relatif au produit, pour le diagnostic.
async function assertExactOwnedTree(root, tree) {
    try {
        const text = (await readProductFile(root, APP_MANIFEST)).toString(
            'utf8'
        );
        const files = { [APP_MANIFEST]: text };
        for (const entry of JSON.parse(text).generated_files) {
            const content = await readProductFile(root, entry.path);
            if (
                sha256(content) !== entry.sha256 ||
                content.length !== entry.bytes
            )
                externalFailure('drift');
            files[entry.path] = content.toString('utf8');
        }
        await verifyGeneratedTree(root, files);
    } catch {
        ambiguous({ tree, ...(await firstOwnedTreeDrift(root)) });
    }
}

// Un candidat est retiré seulement s'il est un état exact : partiel du plan
// courant, ou complet selon son propre manifeste.
async function disposeCandidate(options, candidate) {
    let plan;
    try {
        if (options.tool && options.files)
            plan = await planApplicationPublication(
                options,
                recovering(options)
            );
    } catch {
        plan = undefined;
    }
    if (plan?.candidate === candidate) {
        try {
            await verifyGeneratedTree(candidate, plan.files, { partial: true });
        } catch {
            ambiguous({
                tree: `apps/${basename(candidate)}`,
                path: null,
                kind: 'partial',
            });
        }
    } else await assertExactOwnedTree(candidate, `apps/${basename(candidate)}`);
    await removeTreeAndSync(candidate);
}

const recovering = (options) => ({ recoveringApp: options.appName });

// Reprise, verrou tenu : une publication interrompue est annulée si son état
// est exact ; sinon elle est refusée comme ambiguë et tout reste en place. Le
// nouvel arbre n'est jamais adopté sans avoir fini ses contrôles. Tant qu'elle
// n'est pas reprise, toute autre commande extérieure est refusée.
async function recoverUnderLock(options) {
    const { apps, output } = appLocation(options);
    const prefix = `.${options.appName}.`;
    const own = (await readdir(apps)).filter(
        (name) =>
            name.startsWith(prefix) &&
            /^\.[a-z][a-z0-9-]*\.(?:publication|previous)-candidate-[a-f0-9]{64}$/.test(
                name
            )
    );
    const previous = own.filter((name) => name.includes('.previous-'));
    const candidates = own.filter((name) => name.includes('.publication-'));
    if (previous.length > 1 || candidates.length > 1)
        ambiguous({ tree: 'apps', path: null, kind: 'several' });
    if (previous.length === 1) {
        const previousRoot = resolve(apps, previous[0]);
        await assertExactOwnedTree(previousRoot, `apps/${previous[0]}`);
        if (await pathExists(output)) {
            if (candidates.length === 1)
                ambiguous({ tree: 'apps', path: null, kind: 'several' });
            // Échange fait, contrôles non confirmés : retour à l'état relu.
            await assertExactOwnedTree(output, `apps/${options.appName}`);
            const failed = resolve(
                apps,
                previous[0].replace('.previous-', '.publication-')
            );
            await renameAndSync(output, failed);
            await renameAndSync(previousRoot, output);
            await removeTreeAndSync(failed);
        } else {
            await renameAndSync(previousRoot, output);
            if (candidates.length === 1)
                await disposeCandidate(options, resolve(apps, candidates[0]));
        }
        return { recovered: true };
    }
    if (candidates.length === 1) {
        await disposeCandidate(options, resolve(apps, candidates[0]));
        return { recovered: true };
    }
    return { recovered: false };
}

// Commande de reprise explicite (recover:application-publication) : racine du
// produit vérifiée comme pour toute commande extérieure, puis verrou de
// l'application.
export async function recoverApplicationPublication(options) {
    const { output } = appLocation(options);
    await ownedProductContext({
        workspaceRoot: options.workspaceRoot ?? repositoryRoot,
        targetRoot: options.targetRoot,
    });
    return withGenerationLock(output, () => recoverUnderLock(options));
}

async function alreadyPublished(options) {
    const workspace = await readOwnedWorkspace(options, recovering(options));
    const app = await currentApplication(workspace, options.appName);
    return (
        app.manifest.ownership.publications.at(-1)?.plan_id ===
        options.expectedPlanId
    );
}

export async function publishApplicationPublication(
    options,
    dependencies = {}
) {
    if (!/^[a-f0-9]{64}$/.test(options.expectedPlanId ?? ''))
        externalFailure('publication requires a reviewed plan');
    const run = dependencies.run ?? runExternalApplicationCommand;
    const phase = dependencies.phase ?? (() => undefined);
    // Injectable pour éprouver un échec entre les deux renommages de l'échange.
    const swap = dependencies.rename ?? renameAndSync;
    const internal = recovering(options);
    const { output } = appLocation(options);
    return withGenerationLock(output, async () => {
        const recovery = await recoverUnderLock(options);
        if (await alreadyPublished(options))
            return {
                plan_id: options.expectedPlanId,
                replayed: true,
                recovered: recovery.recovered,
            };
        const plan = await planApplicationPublication(options, internal);
        if (plan.plan_id !== options.expectedPlanId)
            externalFailure('reviewed publication plan is stale');
        const recheck = async () => {
            const current = await planApplicationPublication(options, internal);
            if (current.plan_id !== plan.plan_id)
                externalFailure('publication inputs changed');
        };
        await stageGeneratedTree(plan.candidate, plan.files);
        try {
            await phase('candidate-staged', plan);
            await run(
                process.execPath,
                [
                    installedBin(
                        plan,
                        plan.profile === 'angular-pwa'
                            ? '@angular/compiler-cli'
                            : 'typescript',
                        plan.profile === 'angular-pwa' ? 'ngc' : 'tsc'
                    ),
                    '-p',
                    resolve(plan.candidate, 'tsconfig.app.json'),
                    '--noEmit',
                ],
                plan.root
            );
            await verifyGeneratedTree(plan.candidate, plan.files);
            await phase('compiled', plan);
            await recheck();
            await swap(plan.outputAbsolute, plan.previous);
            await swap(plan.candidate, plan.outputAbsolute);
            await phase('published', plan);
            for (const target of ['build:production', 'lint', 'test']) {
                await run(
                    process.execPath,
                    [
                        installedBin(plan, 'nx', 'nx'),
                        'run',
                        `${plan.app_name}:${target}`,
                        '--skipNxCache',
                        '--outputStyle=stream',
                    ],
                    plan.root
                );
                await verifyGeneratedTree(plan.outputAbsolute, plan.files);
                await phase(target, plan);
            }
            await run(
                process.execPath,
                [
                    resolve(
                        plan.root,
                        `${EXTERNAL_WORKSPACE_CMZ.support}/check-workspace.mjs`
                    ),
                ],
                plan.root
            );
            await assertSourceWeight(plan.root);
            await verifyGeneratedTree(plan.outputAbsolute, plan.files);
            const after = await readOwnedWorkspace(options, internal);
            if (after.plan_id !== plan.workspace.plan_id)
                externalFailure('workspace changed during publication');
            verifyApplicationOwnership(
                JSON.parse(plan.files[APP_MANIFEST]),
                after.manifest.workspace_id
            );
            await phase('verified', plan);
            await removeTreeAndSync(plan.previous);
            return {
                plan_id: plan.plan_id,
                replayed: false,
                recovered: recovery.recovered,
                plan,
            };
        } catch (error) {
            try {
                // L'ancien arbre mis de côté revient toujours, même si l'échange
                // s'est arrêté entre ses deux renommages : l'application n'est
                // jamais laissée absente. Seul un arbre neuf encore exact est
                // déplacé ; sinon tout reste en place.
                if (await pathExists(plan.previous)) {
                    if (await pathExists(plan.outputAbsolute)) {
                        await verifyGeneratedTree(
                            plan.outputAbsolute,
                            plan.files
                        );
                        await renameAndSync(
                            plan.outputAbsolute,
                            plan.candidate
                        );
                    }
                    await renameAndSync(plan.previous, plan.outputAbsolute);
                }
                if (await pathExists(plan.candidate)) {
                    await verifyGeneratedTree(plan.candidate, plan.files);
                    await removeTreeAndSync(plan.candidate);
                }
            } catch (rollbackError) {
                throw new AggregateError(
                    [error, rollbackError],
                    'external application: publication rollback refused; inspect the owned tree locally',
                    { cause: rollbackError }
                );
            }
            throw error;
        }
    });
}
