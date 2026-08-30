import { access, lstat, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import {
    generationTreeSha256,
    sha256,
    stableStringify,
} from './generation-manifest.mjs';

/**
 * Étape 3 (additive) du chantier « générateur en couches » (ADR-0003 §5d).
 *
 * Les 3 clés `angular-domain`/`angular-data`/`angular-application`
 * s'ajoutent à `angular`/`reactjs` sans les remplacer : le pipeline plat
 * existant (2 targets) reste intégralement fonctionnel, inchangé, testé
 * par ses propres golden manifests. Les 3 nouvelles clés permettent à un
 * appelant (aujourd'hui : uniquement des tests, pas encore
 * generate-action-request.mjs) de publier la sortie en couches Angular
 * produite par renderAngularNxLayered (étape 2) via le même pipeline
 * transactionnel (core/generation-publication.mjs, déjà générique).
 *
 * React et workflow-action restent hors périmètre de cette étape — voir
 * le plan associé (audit staff, 2026-08-28).
 */
/**
 * Source de vérité unique des target IDs valides (ADR-0003 §5d). Exportée
 * pour que tout code amené à valider un target ID (ex:
 * generation-transaction.mjs relisant le journal d'une transaction
 * interrompue) le fasse contre cette liste plutôt que contre une copie
 * littérale figée — piège identifié le 2026-08-29 : la liste blanche
 * ['angular', 'reactjs'] de generation-transaction.mjs n'avait jamais été
 * étendue aux 6 targets en couches ajoutés ici, rendant tout journal de
 * transaction en couches invalide pour son propre mécanisme de reprise.
 */
export const targetProfiles = {
    angular: 'angular-nx',
    reactjs: 'react-typescript',
    'angular-domain': 'angular-nx-layered-domain',
    'angular-data': 'angular-nx-layered-data',
    'angular-application': 'angular-nx-layered-application',
    'react-domain': 'react-typescript-layered-domain',
    'react-data': 'react-typescript-layered-data',
    'react-application': 'react-typescript-layered-application',
};

export const controlPlaneManifestFilename = 'generation-control-manifest.json';

function fail(message) {
    throw new Error(`generation dry-run: ${message}`);
}

function isPlainRecord(value) {
    return (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        Object.getPrototypeOf(value) === Object.prototype
    );
}

function hasExactKeys(value, keys) {
    return (
        isPlainRecord(value) &&
        Object.keys(value).sort().join('\0') === [...keys].sort().join('\0')
    );
}

function validHash(value) {
    return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
}

function supportedOwnership(artifact) {
    return (
        (artifact.owner === 'generator-owned' &&
            artifact.write_policy === 'replace') ||
        (artifact.owner === 'human-owned' &&
            artifact.write_policy === 'preserve')
    );
}

export function buildControlPlaneManifest(controlFiles) {
    const files = Object.entries(controlFiles)
        .map(([path, artifact]) => {
            safeOutputPath('/control-plane', path);
            if (
                !artifact ||
                typeof artifact.artifact_id !== 'string' ||
                !/^[a-z][a-z0-9-]*$/.test(artifact.artifact_id) ||
                (typeof artifact.content !== 'string' &&
                    !Buffer.isBuffer(artifact.content)) ||
                artifact.content.length === 0
            ) {
                fail(`invalid control-plane artifact ${path}`);
            }
            return {
                path,
                artifact_id: artifact.artifact_id,
                owner: 'generator-owned',
                write_policy: 'replace',
                bytes: Buffer.byteLength(artifact.content),
                sha256: sha256(artifact.content),
            };
        })
        .sort((left, right) => left.path.localeCompare(right.path));
    return {
        schema_version: '1.0.0',
        files,
        tree_sha256: generationTreeSha256(files),
    };
}

async function exists(path) {
    try {
        await access(path);
        return true;
    } catch (error) {
        if (error.code === 'ENOENT') return false;
        throw error;
    }
}

function safeOutputPath(root, path) {
    if (
        path.startsWith('/') ||
        path.split('/').includes('..') ||
        !/^[a-z0-9][a-z0-9/._-]*$/.test(path)
    ) {
        fail(`unsafe artifact path ${path}`);
    }
    const output = resolve(root, path);
    if (!output.startsWith(`${resolve(root)}/`)) {
        fail(`artifact escapes target root: ${path}`);
    }
    return output;
}

function validateGenerationManifest(manifest, targetId, targetRoot, label) {
    if (
        !hasExactKeys(manifest, [
            'schema_version',
            'generator',
            'input',
            'plan',
            'target',
            'files',
            'tree_sha256',
        ]) ||
        manifest.schema_version !== '1.1.0' ||
        !hasExactKeys(manifest.generator, ['name', 'version']) ||
        manifest.generator.name !== 'cmz-generator-platform' ||
        manifest.generator.version !== '1.2.0' ||
        !hasExactKeys(manifest.input, ['model_id', 'sha256']) ||
        typeof manifest.input.model_id !== 'string' ||
        manifest.input.model_id.length === 0 ||
        !validHash(manifest.input.sha256) ||
        !hasExactKeys(manifest.plan, ['plan_id', 'sha256']) ||
        typeof manifest.plan.plan_id !== 'string' ||
        manifest.plan.plan_id.length === 0 ||
        !validHash(manifest.plan.sha256) ||
        !hasExactKeys(manifest.target, [
            'profile_id',
            'profile_version',
            'profile_sha256',
        ]) ||
        manifest.target.profile_id !== targetProfiles[targetId] ||
        !/^\d+\.\d+\.\d+$/.test(manifest.target.profile_version ?? '') ||
        !validHash(manifest.target.profile_sha256) ||
        !Array.isArray(manifest.files) ||
        manifest.files.length === 0 ||
        !validHash(manifest.tree_sha256)
    ) {
        fail(`${targetId}: invalid ${label}`);
    }
    const paths = new Set();
    for (const artifact of manifest.files) {
        if (
            !hasExactKeys(artifact, [
                'path',
                'artifact_id',
                'owner',
                'write_policy',
                'bytes',
                'sha256',
            ]) ||
            typeof artifact.path !== 'string'
        ) {
            fail(`${targetId}: invalid artifact in ${label}`);
        }
        safeOutputPath(targetRoot, artifact.path);
        if (!supportedOwnership(artifact)) {
            fail(
                `${targetId}:${artifact.path}: unsupported ownership policy ${artifact.owner}/${artifact.write_policy}`
            );
        }
        if (
            !validHash(artifact.sha256) ||
            !/^[a-z][a-z0-9-]*$/.test(artifact.artifact_id ?? '') ||
            !Number.isInteger(artifact.bytes) ||
            artifact.bytes <= 0 ||
            paths.has(artifact.path)
        ) {
            fail(`${targetId}:${artifact.path}: invalid artifact metadata`);
        }
        paths.add(artifact.path);
    }
    if (generationTreeSha256(manifest.files) !== manifest.tree_sha256) {
        fail(`${targetId}: ${label} tree hash drifted`);
    }
}

async function loadPreviousManifest(targetRoot, targetId) {
    const manifestPath = resolve(targetRoot, 'generation-manifest.json');
    const targetExists = await exists(targetRoot);
    if (!(await exists(manifestPath))) {
        if (targetExists) {
            const targetStat = await lstat(targetRoot);
            if (targetStat.isSymbolicLink() || !targetStat.isDirectory()) {
                fail(`${targetId}: target root is not a directory`);
            }
            fail(`${targetId}: existing target has no generation manifest`);
        }
        return undefined;
    }
    let manifest;
    try {
        manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    } catch (error) {
        fail(`${targetId}: unreadable generation manifest (${error.message})`);
    }
    validateGenerationManifest(
        manifest,
        targetId,
        targetRoot,
        'previous generation manifest'
    );
    return manifest;
}

async function loadPreviousControlPlane(outputRoot) {
    const manifestPath = resolve(outputRoot, controlPlaneManifestFilename);
    if (!(await exists(manifestPath))) {
        if (await exists(outputRoot)) {
            fail('existing output has no control-plane manifest');
        }
        return undefined;
    }
    let manifest;
    try {
        manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    } catch (error) {
        fail(`unreadable control-plane manifest (${error.message})`);
    }
    if (
        !hasExactKeys(manifest, ['schema_version', 'files', 'tree_sha256']) ||
        manifest.schema_version !== '1.0.0' ||
        !Array.isArray(manifest.files) ||
        manifest.files.length === 0 ||
        !validHash(manifest.tree_sha256)
    ) {
        fail('unsupported control-plane manifest');
    }
    const paths = new Set();
    for (const artifact of manifest.files) {
        safeOutputPath(outputRoot, artifact.path);
        if (
            !hasExactKeys(artifact, [
                'path',
                'artifact_id',
                'owner',
                'write_policy',
                'bytes',
                'sha256',
            ]) ||
            artifact.owner !== 'generator-owned' ||
            artifact.write_policy !== 'replace' ||
            !/^[a-f0-9]{64}$/.test(artifact.sha256 ?? '') ||
            !/^[a-z][a-z0-9-]*$/.test(artifact.artifact_id ?? '') ||
            !Number.isInteger(artifact.bytes) ||
            artifact.bytes <= 0 ||
            paths.has(artifact.path)
        ) {
            fail(`invalid control-plane artifact ${artifact.path}`);
        }
        paths.add(artifact.path);
    }
    if (generationTreeSha256(manifest.files) !== manifest.tree_sha256) {
        fail('control-plane manifest tree hash drifted');
    }
    return manifest;
}

async function observeControlPlane(outputRoot, manifest, desiredFiles) {
    const observed = new Map();
    for (const artifact of manifest.files) {
        const path = safeOutputPath(outputRoot, artifact.path);
        let content;
        try {
            content = await readFile(path);
        } catch (error) {
            if (error.code === 'ENOENT') {
                fail(`control-plane artifact is missing: ${artifact.path}`);
            }
            throw error;
        }
        const actual = sha256(content);
        if (actual !== artifact.sha256) {
            const desired = desiredFiles?.[artifact.path];
            const matchesDesired =
                desired &&
                sha256(desired.content) === actual &&
                Buffer.byteLength(desired.content) === content.byteLength;
            if (!matchesDesired) {
                fail(
                    `control-plane artifact drifted: ${artifact.path} (expected ${artifact.sha256}, actual ${actual})`
                );
            }
        }
        if (
            content.byteLength === 0 ||
            (actual === artifact.sha256 &&
                content.byteLength !== artifact.bytes)
        ) {
            fail(`control-plane artifact size drifted: ${artifact.path}`);
        }
        observed.set(artifact.path, content);
    }
    return observed;
}

async function planControlPlane(outputRoot, controlFiles) {
    const previous = await loadPreviousControlPlane(outputRoot);
    let desiredFiles = controlFiles;
    if (!desiredFiles) {
        if (!previous) return undefined;
        const observed = await observeControlPlane(outputRoot, previous);
        desiredFiles = Object.fromEntries(
            previous.files.map((artifact) => [
                artifact.path,
                {
                    artifact_id: artifact.artifact_id,
                    content: observed.get(artifact.path),
                },
            ])
        );
    }
    const desired = buildControlPlaneManifest(desiredFiles);
    const previousByPath = new Map();
    let observed = new Map();
    if (previous) {
        observed = await observeControlPlane(
            outputRoot,
            previous,
            desiredFiles
        );
        for (const artifact of previous.files) {
            if (previousByPath.has(artifact.path)) {
                fail(`duplicate control-plane artifact ${artifact.path}`);
            }
            previousByPath.set(artifact.path, artifact);
        }
    }
    const changes = [];
    for (const after of desired.files) {
        const before = previousByPath.get(after.path);
        previousByPath.delete(after.path);
        const beforeSha256 = before
            ? sha256(observed.get(after.path))
            : undefined;
        changes.push({
            path: after.path,
            artifact_id: after.artifact_id,
            owner: after.owner,
            action: !before
                ? 'create'
                : beforeSha256 === after.sha256 &&
                    before.artifact_id === after.artifact_id
                  ? 'unchanged'
                  : 'replace',
            ...(before ? { before_sha256: beforeSha256 } : {}),
            after_sha256: after.sha256,
        });
    }
    for (const before of previousByPath.values()) {
        changes.push({
            path: before.path,
            artifact_id: before.artifact_id,
            owner: before.owner,
            action: 'delete',
            before_sha256: before.sha256,
        });
    }
    changes.sort((left, right) => left.path.localeCompare(right.path));
    return {
        report: {
            ...(previous
                ? {
                      previous_manifest_sha256: sha256(
                          stableStringify(previous)
                      ),
                  }
                : {}),
            desired_manifest_sha256: sha256(stableStringify(desired)),
            changes,
        },
        manifest: desired,
    };
}

async function observePreviousArtifact(
    targetRoot,
    targetId,
    artifact,
    desiredArtifact,
    desiredContent
) {
    const path = safeOutputPath(targetRoot, artifact.path);
    let content;
    try {
        content = await readFile(path);
    } catch (error) {
        if (error.code === 'ENOENT') {
            fail(`${targetId}:${artifact.path}: generated artifact is missing`);
        }
        throw error;
    }
    const actual = sha256(content);
    if (artifact.owner === 'generator-owned' && actual !== artifact.sha256) {
        const matchesDesired =
            desiredArtifact?.owner === 'generator-owned' &&
            desiredContent !== undefined &&
            actual === desiredArtifact.sha256 &&
            content.byteLength === desiredArtifact.bytes &&
            sha256(desiredContent) === actual;
        if (!matchesDesired) {
            fail(
                `${targetId}:${artifact.path}: generated artifact drifted (expected ${artifact.sha256}, actual ${actual})`
            );
        }
    }
    if (content.byteLength === 0) {
        fail(`${targetId}:${artifact.path}: owned artifact is empty`);
    }
    if (
        artifact.owner === 'generator-owned' &&
        actual === artifact.sha256 &&
        content.byteLength !== artifact.bytes
    ) {
        fail(`${targetId}:${artifact.path}: owned artifact size drifted`);
    }
    return { bytes: content.byteLength, sha256: actual };
}

function desiredByPath(targetId, desired) {
    validateGenerationManifest(
        desired.manifest,
        targetId,
        `/desired/${targetId}`,
        'desired generation manifest'
    );
    const entries = new Map();
    for (const artifact of desired.manifest.files) {
        if (!supportedOwnership(artifact)) {
            fail(
                `${targetId}:${artifact.path}: desired ownership policy ${artifact.owner}/${artifact.write_policy} is unsupported`
            );
        }
        if (entries.has(artifact.path)) {
            fail(`${targetId}:${artifact.path}: duplicate desired artifact`);
        }
        entries.set(artifact.path, artifact);
        if (desired.files) {
            const content = desired.files[artifact.path];
            if (
                (typeof content !== 'string' && !Buffer.isBuffer(content)) ||
                sha256(content) !== artifact.sha256 ||
                Buffer.byteLength(content) !== artifact.bytes
            ) {
                fail(`${targetId}:${artifact.path}: desired content drifted`);
            }
        }
    }
    if (desired.files) {
        for (const path of Object.keys(desired.files)) {
            if (!entries.has(path)) {
                fail(`${targetId}:${path}: desired file has no manifest owner`);
            }
        }
    }
    return entries;
}

async function planTarget(outputRoot, targetId, desired) {
    const targetRoot = resolve(outputRoot, targetId);
    const previous = await loadPreviousManifest(targetRoot, targetId);
    const desiredArtifacts = desiredByPath(targetId, desired);
    const previousArtifacts = new Map();
    const observedArtifacts = new Map();
    if (previous) {
        for (const artifact of previous.files) {
            if (previousArtifacts.has(artifact.path)) {
                fail(
                    `${targetId}:${artifact.path}: duplicate previous artifact`
                );
            }
            previousArtifacts.set(artifact.path, artifact);
            observedArtifacts.set(
                artifact.path,
                await observePreviousArtifact(
                    targetRoot,
                    targetId,
                    artifact,
                    desiredArtifacts.get(artifact.path),
                    desired.files?.[artifact.path]
                )
            );
        }
    }

    const changes = [];
    const effectiveDesiredArtifacts = [];
    for (const [path, after] of desiredArtifacts) {
        const before = previousArtifacts.get(path);
        if (!before) {
            if (await exists(safeOutputPath(targetRoot, path))) {
                fail(`${targetId}:${path}: unowned artifact collision`);
            }
            changes.push({
                path,
                artifact_id: after.artifact_id,
                owner: after.owner,
                action: 'create',
                after_sha256: after.sha256,
            });
            effectiveDesiredArtifacts.push(after);
            continue;
        }
        previousArtifacts.delete(path);
        if (
            before.owner !== after.owner ||
            before.write_policy !== after.write_policy
        ) {
            fail(`${targetId}:${path}: ownership migration is unsupported`);
        }
        if (after.owner === 'human-owned') {
            if (before.artifact_id !== after.artifact_id) {
                fail(
                    `${targetId}:${path}: human extension contract migration is unsupported`
                );
            }
            const observed = observedArtifacts.get(path);
            changes.push({
                path,
                artifact_id: after.artifact_id,
                owner: after.owner,
                action: 'preserve',
                before_sha256: observed.sha256,
                after_sha256: observed.sha256,
            });
            effectiveDesiredArtifacts.push({ ...after, ...observed });
            continue;
        }
        const observed = observedArtifacts.get(path);
        const unchanged =
            observed.sha256 === after.sha256 &&
            before.artifact_id === after.artifact_id &&
            before.write_policy === after.write_policy;
        changes.push({
            path,
            artifact_id: after.artifact_id,
            owner: after.owner,
            action: unchanged ? 'unchanged' : 'replace',
            before_sha256: observed.sha256,
            after_sha256: after.sha256,
        });
        effectiveDesiredArtifacts.push(after);
    }

    for (const before of previousArtifacts.values()) {
        if (before.owner === 'human-owned') {
            fail(
                `${targetId}:${before.path}: removing a human-owned extension requires an explicit migration`
            );
        }
        changes.push({
            path: before.path,
            artifact_id: before.artifact_id,
            owner: before.owner,
            action: 'delete',
            before_sha256: before.sha256,
        });
    }
    changes.sort((left, right) => left.path.localeCompare(right.path));
    effectiveDesiredArtifacts.sort((left, right) =>
        left.path.localeCompare(right.path)
    );
    const effectiveDesiredManifest = {
        ...desired.manifest,
        files: effectiveDesiredArtifacts,
        tree_sha256: generationTreeSha256(effectiveDesiredArtifacts),
    };
    return {
        id: targetId,
        ...(previous
            ? {
                  previous_manifest_sha256: sha256(stableStringify(previous)),
              }
            : {}),
        desired_manifest_sha256: sha256(
            stableStringify(effectiveDesiredManifest)
        ),
        changes,
    };
}

export async function buildGenerationChangeSet({
    outputRoot,
    targets,
    controlFiles,
}) {
    if (!isPlainRecord(targets)) fail('targets must be an object');
    const unknownTargets = Object.keys(targets).filter(
        (targetId) => !Object.hasOwn(targetProfiles, targetId)
    );
    if (unknownTargets.length > 0) {
        fail(`unsupported targets: ${unknownTargets.join(', ')}`);
    }
    const controlPlane = await planControlPlane(outputRoot, controlFiles);
    const plannedTargets = [];
    // Itère sur targetProfiles (source de vérité des targets supportés)
    // plutôt qu'une liste littérale — sinon un target ajouté à
    // targetProfiles mais absent de cette liste serait silencieusement
    // ignoré au lieu d'être publié (piège identifié lors de l'audit du
    // 2026-08-28 avant l'extension additive aux targets en couches).
    for (const targetId of Object.keys(targetProfiles)) {
        if (targets[targetId]) {
            plannedTargets.push(
                await planTarget(outputRoot, targetId, targets[targetId])
            );
        }
    }
    if (plannedTargets.length === 0) fail('at least one target is required');
    const summary = {
        create: 0,
        replace: 0,
        preserve: 0,
        delete: 0,
        unchanged: 0,
    };
    for (const target of plannedTargets) {
        for (const change of target.changes) summary[change.action] += 1;
    }
    if (controlPlane) {
        for (const change of controlPlane.report.changes) {
            summary[change.action] += 1;
        }
    }
    const body = {
        schema_version: '1.0.0',
        mode: 'dry-run',
        ...(controlPlane ? { control_plane: controlPlane.report } : {}),
        targets: plannedTargets,
        summary,
    };
    return {
        ...body,
        change_set_id: `changes:${sha256(stableStringify(body))}`,
    };
}
