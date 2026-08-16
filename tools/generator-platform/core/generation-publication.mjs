import { access, lstat, mkdir, readFile, readdir } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

import {
    buildControlPlaneManifest,
    buildGenerationChangeSet,
    controlPlaneManifestFilename,
} from './generation-change-set.mjs';
import {
    generationTreeSha256,
    sha256,
    stableStringify,
} from './generation-manifest.mjs';
import {
    commitDirectoryTransaction,
    finishTransaction,
    prepareTransaction,
    syncTreeDirectories,
    withGenerationLock,
    writeDocument,
} from './generation-transaction.mjs';
import { assertSupportedPublicationFilesystem } from './publication-durability.mjs';
import { typecheckGenerated } from './typecheck-generated.mjs';
import { repositoryRoot } from '../validate-ir.mjs';

function fail(message) {
    throw new Error(`generation publication: ${message}`);
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
        fail(`artifact escapes output root: ${path}`);
    }
    return output;
}

function manifestDocument(manifest) {
    return `${JSON.stringify(manifest, null, 2)}\n`;
}

async function assertPlainDirectory(path, label) {
    let metadata;
    try {
        metadata = await lstat(path);
    } catch (error) {
        if (error.code === 'ENOENT') fail(`${label} does not exist`);
        throw error;
    }
    if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
        fail(`${label} must be a real directory, not a link or special file`);
    }
}

function decodeTypeScript(path, content, targetId) {
    if (!path.endsWith('.ts') || !Buffer.isBuffer(content)) return content;
    try {
        return new TextDecoder('utf-8', { fatal: true }).decode(content);
    } catch {
        fail(`${targetId}:${path}: TypeScript artifact is not valid UTF-8`);
    }
}

function assertDesiredTarget(targetId, target) {
    if (!target?.manifest?.files || !target.files) {
        fail(`${targetId}: desired target files and manifest are required`);
    }
    const manifestPaths = new Set();
    for (const artifact of target.manifest.files) {
        if (manifestPaths.has(artifact.path)) {
            fail(`${targetId}:${artifact.path}: duplicate desired artifact`);
        }
        manifestPaths.add(artifact.path);
        const content = target.files[artifact.path];
        if (typeof content !== 'string' && !Buffer.isBuffer(content)) {
            fail(`${targetId}:${artifact.path}: desired content is missing`);
        }
        if (
            sha256(content) !== artifact.sha256 ||
            Buffer.byteLength(content) !== artifact.bytes
        ) {
            fail(`${targetId}:${artifact.path}: desired content drifted`);
        }
    }
    for (const path of Object.keys(target.files)) {
        if (!manifestPaths.has(path)) {
            fail(`${targetId}:${path}: desired file has no manifest owner`);
        }
    }
    if (
        generationTreeSha256(target.manifest.files) !==
        target.manifest.tree_sha256
    ) {
        fail(`${targetId}: desired manifest tree hash drifted`);
    }
}

async function buildCandidateTarget(
    outputRoot,
    targetId,
    target,
    targetChangeSet
) {
    assertDesiredTarget(targetId, target);
    const changes = new Map(
        targetChangeSet.changes.map((change) => [change.path, change])
    );
    if (changes.size !== targetChangeSet.changes.length) {
        fail(`${targetId}: duplicate change path`);
    }
    const files = {};
    const manifestFiles = [];
    for (const artifact of target.manifest.files) {
        const change = changes.get(artifact.path);
        if (!change) {
            fail(`${targetId}:${artifact.path}: change is missing`);
        }
        changes.delete(artifact.path);
        if (
            !['create', 'replace', 'unchanged', 'preserve'].includes(
                change.action
            )
        ) {
            fail(
                `${targetId}:${artifact.path}: invalid desired action ${change.action}`
            );
        }
        let content = target.files[artifact.path];
        if (change.action === 'preserve') {
            content = await readFile(
                safeOutputPath(resolve(outputRoot, targetId), artifact.path)
            );
            if (
                sha256(content) !== change.before_sha256 ||
                change.before_sha256 !== change.after_sha256
            ) {
                fail(`${targetId}:${artifact.path}: preserved content changed`);
            }
        } else if (
            artifact.owner === 'human-owned' &&
            change.action !== 'create'
        ) {
            fail(
                `${targetId}:${artifact.path}: human content was not preserved`
            );
        }
        files[artifact.path] = content;
        manifestFiles.push({
            ...artifact,
            bytes: Buffer.byteLength(content),
            sha256: sha256(content),
        });
    }
    for (const change of changes.values()) {
        if (change.action !== 'delete') {
            fail(`${targetId}:${change.path}: change has no desired artifact`);
        }
    }
    manifestFiles.sort((left, right) => left.path.localeCompare(right.path));
    const manifest = {
        ...target.manifest,
        files: manifestFiles,
        tree_sha256: generationTreeSha256(manifestFiles),
    };
    if (
        sha256(stableStringify(manifest)) !==
        targetChangeSet.desired_manifest_sha256
    ) {
        fail(`${targetId}: effective desired manifest drifted`);
    }
    typecheckGenerated(
        Object.fromEntries(
            Object.entries(files).map(([path, content]) => [
                path,
                decodeTypeScript(path, content, targetId),
            ])
        ),
        targetId,
        repositoryRoot
    );
    return { files, manifest };
}

async function readManifest(path, label) {
    try {
        return JSON.parse(await readFile(path, 'utf8'));
    } catch (error) {
        fail(`${label} is unreadable (${error.message})`);
    }
}

async function assertDirectoryContainsOnly(root, allowedFiles) {
    await assertPlainDirectory(root, `owned output ${root}`);
    const allowed = new Set(allowedFiles);
    async function visit(directory) {
        for (const entry of await readdir(directory, { withFileTypes: true })) {
            const absolute = resolve(directory, entry.name);
            const path = relative(root, absolute).replaceAll('\\', '/');
            if (entry.isSymbolicLink()) {
                fail(`symbolic links are unsupported in owned output: ${path}`);
            }
            if (entry.isDirectory()) {
                if (![...allowed].some((file) => file.startsWith(`${path}/`))) {
                    fail(`unowned directory in generated output: ${path}`);
                }
                await visit(absolute);
                continue;
            }
            if (!entry.isFile() || !allowed.has(path)) {
                fail(`unowned artifact in generated output: ${path}`);
            }
        }
    }
    await visit(root);
}

async function assertExistingOutputOwned(outputRoot, targets) {
    const controlManifest = await readManifest(
        resolve(outputRoot, controlPlaneManifestFilename),
        'control-plane manifest'
    );
    const rootFiles = [
        controlPlaneManifestFilename,
        ...controlManifest.files.map(({ path }) => path),
    ];
    for (const targetId of Object.keys(targets)) {
        const targetRoot = resolve(outputRoot, targetId);
        if (!(await exists(targetRoot))) continue;
        const manifest = await readManifest(
            resolve(targetRoot, 'generation-manifest.json'),
            `${targetId} manifest`
        );
        await assertDirectoryContainsOnly(targetRoot, [
            'generation-manifest.json',
            ...manifest.files.map(({ path }) => path),
        ]);
        rootFiles.push(`${targetId}/generation-manifest.json`);
        rootFiles.push(
            ...manifest.files.map(({ path }) => `${targetId}/${path}`)
        );
    }
    await assertDirectoryContainsOnly(outputRoot, rootFiles);
}

async function stageGenerationCandidate({
    transactionRoot,
    outputRoot,
    targets,
    controlFiles,
    changeSet,
}) {
    const candidateRoot = resolve(transactionRoot, 'candidate');
    await mkdir(candidateRoot);
    const controlManifest = buildControlPlaneManifest(controlFiles);
    if (
        sha256(stableStringify(controlManifest)) !==
        changeSet.control_plane?.desired_manifest_sha256
    ) {
        fail('effective control-plane manifest drifted');
    }
    for (const [path, artifact] of Object.entries(controlFiles)) {
        await writeDocument(
            safeOutputPath(candidateRoot, path),
            artifact.content
        );
    }
    await writeDocument(
        resolve(candidateRoot, controlPlaneManifestFilename),
        manifestDocument(controlManifest)
    );

    for (const [targetId, target] of Object.entries(targets)) {
        const targetChangeSet = changeSet.targets.find(
            ({ id }) => id === targetId
        );
        if (!targetChangeSet) fail(`${targetId}: target plan is missing`);
        const candidate = await buildCandidateTarget(
            outputRoot,
            targetId,
            target,
            targetChangeSet
        );
        const targetRoot = resolve(candidateRoot, targetId);
        for (const [path, content] of Object.entries(candidate.files)) {
            await writeDocument(safeOutputPath(targetRoot, path), content);
        }
        await writeDocument(
            resolve(targetRoot, 'generation-manifest.json'),
            manifestDocument(candidate.manifest)
        );
    }
    await syncTreeDirectories(candidateRoot);
    return candidateRoot;
}

export async function inspectGenerationChangeSet({
    outputRoot,
    targets,
    controlFiles,
}) {
    if (await exists(outputRoot)) {
        await assertPlainDirectory(outputRoot, 'generation output');
    }
    return buildGenerationChangeSet({ outputRoot, targets, controlFiles });
}

export async function createGenerationOutput({
    outputRoot,
    targets,
    controlFiles,
}) {
    await assertSupportedPublicationFilesystem({ root: dirname(outputRoot) });
    return withGenerationLock(outputRoot, async () => {
        if (await exists(outputRoot)) fail('output already exists');
        const changeSet = await buildGenerationChangeSet({
            outputRoot,
            targets,
            controlFiles,
        });
        const { transactionRoot, journal } = await prepareTransaction({
            outputRoot,
            changeSet,
            hadPrevious: false,
        });
        let preserveTransactionRoot = false;
        let publication;
        let operationError;
        try {
            const candidateRoot = await stageGenerationCandidate({
                transactionRoot,
                outputRoot,
                targets,
                controlFiles,
                changeSet,
            });
            const livePlan = await buildGenerationChangeSet({
                outputRoot,
                targets,
                controlFiles,
            });
            if (livePlan.change_set_id !== changeSet.change_set_id) {
                fail('output changed between planning and publication');
            }
            const commit = await commitDirectoryTransaction({
                outputRoot,
                candidateRoot,
                expectedState: 'absent',
                journal,
            });
            preserveTransactionRoot = commit.cleanup_pending;
            publication = {
                schema_version: '1.0.0',
                status: 'created',
                change_set_id: changeSet.change_set_id,
                targets: Object.keys(targets),
            };
        } catch (error) {
            preserveTransactionRoot = error.preserveTransactionRoot === true;
            operationError = error;
        }
        return finishTransaction({
            transactionRoot,
            publication,
            operationError,
            preserveTransactionRoot,
        });
    });
}

export async function applyGenerationChangeSet({
    outputRoot,
    targets,
    controlFiles,
    expectedChangeSetId,
}) {
    if (!/^changes:[a-f0-9]{64}$/.test(expectedChangeSetId ?? '')) {
        fail('apply requires the reviewed change_set_id');
    }
    await assertSupportedPublicationFilesystem({ root: dirname(outputRoot) });
    return withGenerationLock(outputRoot, async () => {
        if (!(await exists(outputRoot))) {
            fail('apply requires an existing output');
        }
        await assertPlainDirectory(outputRoot, 'generation output');
        const changeSet = await buildGenerationChangeSet({
            outputRoot,
            targets,
            controlFiles,
        });
        if (changeSet.change_set_id !== expectedChangeSetId) {
            fail(
                `reviewed Change Set is stale (expected ${expectedChangeSetId}, actual ${changeSet.change_set_id})`
            );
        }
        await assertExistingOutputOwned(outputRoot, targets);

        const { transactionRoot, journal } = await prepareTransaction({
            outputRoot,
            changeSet,
            hadPrevious: true,
        });
        let preserveTransactionRoot = false;
        let publication;
        let operationError;
        try {
            const candidateRoot = await stageGenerationCandidate({
                transactionRoot,
                outputRoot,
                targets,
                controlFiles,
                changeSet,
            });
            const livePlan = await buildGenerationChangeSet({
                outputRoot,
                targets,
                controlFiles,
            });
            if (livePlan.change_set_id !== changeSet.change_set_id) {
                fail('output changed between planning and publication');
            }
            await assertExistingOutputOwned(outputRoot, targets);
            const commit = await commitDirectoryTransaction({
                outputRoot,
                candidateRoot,
                expectedState: 'present',
                journal,
            });
            preserveTransactionRoot = commit.cleanup_pending;
            publication = {
                schema_version: '1.0.0',
                status: 'applied',
                change_set_id: changeSet.change_set_id,
                targets: Object.keys(targets),
            };
        } catch (error) {
            preserveTransactionRoot = error.preserveTransactionRoot === true;
            operationError = error;
        }
        return finishTransaction({
            transactionRoot,
            publication,
            operationError,
            preserveTransactionRoot,
        });
    });
}
