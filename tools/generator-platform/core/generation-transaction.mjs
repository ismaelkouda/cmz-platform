import { randomUUID } from 'node:crypto';
import {
    access,
    lstat,
    mkdir,
    mkdtemp,
    open,
    readFile,
    readdir,
    rename,
    rm,
} from 'node:fs/promises';
import { hostname } from 'node:os';
import { basename, dirname, relative, resolve } from 'node:path';

import { controlPlaneManifestFilename } from './generation-change-set.mjs';
import {
    generationTreeSha256,
    sha256,
    stableStringify,
} from './generation-manifest.mjs';

function fail(message) {
    throw new Error(`generation publication: ${message}`);
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

export async function writeDocument(path, content) {
    await mkdir(dirname(path), { recursive: true });
    const handle = await open(path, 'wx');
    try {
        await handle.writeFile(content);
        await handle.sync();
    } finally {
        await handle.close();
    }
}

async function syncDirectory(path) {
    const handle = await open(path, 'r');
    try {
        await handle.sync();
    } finally {
        await handle.close();
    }
}

export async function syncTreeDirectories(root) {
    for (const entry of await readdir(root, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            await syncTreeDirectories(resolve(root, entry.name));
        }
    }
    await syncDirectory(root);
}

async function renameAndSync(from, to, renamePath = rename) {
    await renamePath(from, to);
    const parents = new Set([dirname(from), dirname(to)]);
    for (const parent of parents) await syncDirectory(parent);
}

async function removeTreeAndSync(path) {
    const parent = dirname(path);
    await rm(path, { recursive: true, force: true });
    await syncDirectory(parent);
}

function lockRootFor(outputRoot) {
    return resolve(
        dirname(outputRoot),
        `.${basename(outputRoot)}.generation-lock`
    );
}

function transactionPrefixFor(outputRoot) {
    return `.${basename(outputRoot)}.generation-transaction-`;
}

export async function createTransactionRoot(outputRoot) {
    const transactionRoot = await mkdtemp(
        resolve(dirname(outputRoot), transactionPrefixFor(outputRoot))
    );
    await syncDirectory(dirname(transactionRoot));
    return transactionRoot;
}

const transactionJournalFilename = 'transaction-journal.json';

function manifestDocument(manifest) {
    return `${JSON.stringify(manifest, null, 2)}\n`;
}

async function writeTransactionJournal(transactionRoot, journal) {
    const temporaryPath = resolve(
        transactionRoot,
        `.transaction-journal-${randomUUID()}.tmp`
    );
    await writeDocument(temporaryPath, manifestDocument(journal));
    await renameAndSync(
        temporaryPath,
        resolve(transactionRoot, transactionJournalFilename)
    );
}

async function readManifest(path, label) {
    try {
        return JSON.parse(await readFile(path, 'utf8'));
    } catch (error) {
        fail(`${label} is unreadable (${error.message})`);
    }
}

async function readTransactionJournal(transactionRoot) {
    const journal = await readManifest(
        resolve(transactionRoot, transactionJournalFilename),
        `transaction journal ${transactionRoot}`
    );
    const expectedTargets = journal.expected_target_manifest_sha256;
    if (
        !hasExactKeys(journal, [
            'schema_version',
            'output_root',
            'had_previous',
            'phase',
            'change_set_id',
            'expected_control_manifest_sha256',
            'expected_target_manifest_sha256',
        ]) ||
        journal.schema_version !== '1.0.0' ||
        typeof journal.output_root !== 'string' ||
        resolve(journal.output_root) !== journal.output_root ||
        typeof journal.had_previous !== 'boolean' ||
        !['prepared', 'previous-moved', 'candidate-published'].includes(
            journal.phase
        ) ||
        !/^changes:[a-f0-9]{64}$/.test(journal.change_set_id ?? '') ||
        !/^[a-f0-9]{64}$/.test(
            journal.expected_control_manifest_sha256 ?? ''
        ) ||
        !isPlainRecord(expectedTargets) ||
        Object.keys(expectedTargets).length === 0 ||
        Object.keys(expectedTargets).some(
            (targetId) =>
                !['angular', 'reactjs'].includes(targetId) ||
                !/^[a-f0-9]{64}$/.test(expectedTargets[targetId] ?? '')
        ) ||
        (!journal.had_previous && journal.phase === 'previous-moved')
    ) {
        fail(`invalid transaction journal ${transactionRoot}`);
    }
    return journal;
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

async function verifiedManifestPaths(root, manifest, label) {
    if (!Array.isArray(manifest.files) || manifest.files.length === 0) {
        fail(`${label} has no files`);
    }
    const paths = new Set();
    for (const artifact of manifest.files) {
        if (
            typeof artifact?.path !== 'string' ||
            paths.has(artifact.path) ||
            !Number.isInteger(artifact.bytes) ||
            artifact.bytes <= 0 ||
            !/^[a-f0-9]{64}$/.test(artifact.sha256 ?? '')
        ) {
            fail(`${label} contains invalid artifact metadata`);
        }
        const content = await readFile(safeOutputPath(root, artifact.path));
        if (
            content.byteLength !== artifact.bytes ||
            sha256(content) !== artifact.sha256
        ) {
            fail(`${label} artifact drifted: ${artifact.path}`);
        }
        paths.add(artifact.path);
    }
    if (generationTreeSha256(manifest.files) !== manifest.tree_sha256) {
        fail(`${label} tree hash drifted`);
    }
    return [...paths];
}

async function outputMatchesJournal(outputRoot, journal) {
    if (!(await exists(outputRoot))) return false;
    try {
        await assertPlainDirectory(outputRoot, 'recovered generation output');
        const controlManifest = await readManifest(
            resolve(outputRoot, controlPlaneManifestFilename),
            'recovered control-plane manifest'
        );
        if (
            sha256(stableStringify(controlManifest)) !==
            journal.expected_control_manifest_sha256
        ) {
            return false;
        }
        const rootFiles = [
            controlPlaneManifestFilename,
            ...(await verifiedManifestPaths(
                outputRoot,
                controlManifest,
                'recovered control-plane manifest'
            )),
        ];
        for (const [targetId, expectedHash] of Object.entries(
            journal.expected_target_manifest_sha256
        )) {
            const targetRoot = resolve(outputRoot, targetId);
            const targetManifest = await readManifest(
                resolve(targetRoot, 'generation-manifest.json'),
                `recovered ${targetId} manifest`
            );
            if (sha256(stableStringify(targetManifest)) !== expectedHash) {
                return false;
            }
            const targetFiles = await verifiedManifestPaths(
                targetRoot,
                targetManifest,
                `recovered ${targetId} manifest`
            );
            await assertDirectoryContainsOnly(targetRoot, [
                'generation-manifest.json',
                ...targetFiles,
            ]);
            rootFiles.push(`${targetId}/generation-manifest.json`);
            rootFiles.push(...targetFiles.map((path) => `${targetId}/${path}`));
        }
        await assertDirectoryContainsOnly(outputRoot, rootFiles);
        return true;
    } catch {
        return false;
    }
}

export async function recoverInterruptedTransactions(outputRoot) {
    const parent = dirname(outputRoot);
    const prefix = transactionPrefixFor(outputRoot);
    const entries = await readdir(parent, { withFileTypes: true });
    const transactions = entries
        .filter(({ name }) => name.startsWith(prefix))
        .sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of transactions) {
        if (entry.isSymbolicLink() || !entry.isDirectory()) {
            fail(`invalid transaction entry ${entry.name}`);
        }
        const transactionRoot = resolve(parent, entry.name);
        const journal = await readTransactionJournal(transactionRoot);
        if (resolve(journal.output_root) !== resolve(outputRoot)) {
            fail(`transaction ${entry.name} targets another output`);
        }
        const candidateRoot = resolve(transactionRoot, 'candidate');
        const previousRoot = resolve(transactionRoot, 'previous');
        const [outputExists, candidateExists, previousExists] =
            await Promise.all([
                exists(outputRoot),
                exists(candidateRoot),
                exists(previousRoot),
            ]);

        if (previousExists && !outputExists) {
            await renameAndSync(previousRoot, outputRoot);
            await removeTreeAndSync(transactionRoot);
            continue;
        }
        if (previousExists && outputExists) {
            if (
                candidateExists ||
                !(await outputMatchesJournal(outputRoot, journal))
            ) {
                fail(
                    `ambiguous interrupted transaction ${entry.name}; previous output preserved at ${previousRoot}`
                );
            }
            await removeTreeAndSync(previousRoot);
            await removeTreeAndSync(transactionRoot);
            continue;
        }
        if (candidateExists) {
            if (outputExists || !journal.had_previous) {
                await removeTreeAndSync(transactionRoot);
                continue;
            }
            fail(
                `interrupted transaction ${entry.name} lost its previous output`
            );
        }
        if (outputExists) {
            const publishedCandidateMustMatch =
                !journal.had_previous ||
                journal.phase === 'candidate-published';
            if (
                publishedCandidateMustMatch &&
                !(await outputMatchesJournal(outputRoot, journal))
            ) {
                fail(
                    `published transaction ${entry.name} does not match journal`
                );
            }
            await removeTreeAndSync(transactionRoot);
            continue;
        }
        fail(`interrupted transaction ${entry.name} has no recoverable tree`);
    }
}

function processIsAlive(pid) {
    try {
        process.kill(pid, 0);
        return true;
    } catch (error) {
        if (error.code === 'ESRCH') return false;
        if (error.code === 'EPERM') return true;
        throw error;
    }
}

async function acquireGenerationLock(outputRoot) {
    const lockRoot = lockRootFor(outputRoot);
    for (let attempt = 0; attempt < 3; attempt += 1) {
        const contenderRoot = await mkdtemp(`${lockRoot}.contender-`);
        try {
            await writeDocument(
                resolve(contenderRoot, 'owner.json'),
                `${JSON.stringify({
                    schema_version: '1.0.0',
                    pid: process.pid,
                    hostname: hostname(),
                    started_at: new Date().toISOString(),
                })}\n`
            );
            await syncTreeDirectories(contenderRoot);
            await renameAndSync(contenderRoot, lockRoot);
            return lockRoot;
        } catch (error) {
            await removeTreeAndSync(contenderRoot);
            if (!['EEXIST', 'ENOTEMPTY'].includes(error.code)) throw error;
            let owner;
            try {
                owner = JSON.parse(
                    await readFile(resolve(lockRoot, 'owner.json'), 'utf8')
                );
            } catch {
                fail(
                    `generation lock ${lockRoot} is incomplete; manual inspection required`
                );
            }
            if (
                !hasExactKeys(owner, [
                    'schema_version',
                    'pid',
                    'hostname',
                    'started_at',
                ]) ||
                owner.schema_version !== '1.0.0' ||
                !Number.isInteger(owner.pid) ||
                owner.pid <= 0 ||
                typeof owner.hostname !== 'string' ||
                owner.hostname.length === 0 ||
                typeof owner.started_at !== 'string' ||
                Number.isNaN(Date.parse(owner.started_at))
            ) {
                fail(
                    `generation lock ${lockRoot} has an invalid owner; manual inspection required`
                );
            }
            const sameHost = owner.hostname === hostname();
            if (!sameHost || processIsAlive(owner.pid)) {
                fail(
                    `another generation owns ${outputRoot} (${JSON.stringify(owner)})`
                );
            }
            const staleRoot = `${lockRoot}.stale-${randomUUID()}`;
            try {
                await renameAndSync(lockRoot, staleRoot);
            } catch (renameError) {
                if (renameError.code === 'ENOENT') continue;
                throw renameError;
            }
            await removeTreeAndSync(staleRoot);
        }
    }
    fail(`could not acquire generation lock for ${outputRoot}`);
}

export async function withGenerationLock(outputRoot, operation) {
    await assertPlainDirectory(dirname(outputRoot), 'generation output parent');
    const lockRoot = await acquireGenerationLock(outputRoot);
    let result;
    let operationError;
    try {
        await recoverInterruptedTransactions(outputRoot);
        result = await operation();
    } catch (error) {
        operationError = error;
    }
    let releaseError;
    try {
        await removeTreeAndSync(lockRoot);
    } catch (error) {
        releaseError = error;
    }
    if (operationError && releaseError) {
        throw new AggregateError(
            [operationError, releaseError],
            'generation publication: operation and lock release failed'
        );
    }
    if (operationError) throw operationError;
    if (releaseError) throw releaseError;
    return result;
}

export async function commitDirectoryTransaction({
    outputRoot,
    candidateRoot,
    renamePath = rename,
    expectedState = 'auto',
    journal,
}) {
    const outputExists = await exists(outputRoot);
    if (expectedState === 'absent' && outputExists) {
        fail('new output appeared before commit');
    }
    if (expectedState === 'present' && !outputExists) {
        fail('existing output disappeared before commit');
    }
    if (!outputExists) {
        try {
            await renameAndSync(candidateRoot, outputRoot, renamePath);
            if (journal) {
                const published = { ...journal, phase: 'candidate-published' };
                await writeTransactionJournal(
                    dirname(candidateRoot),
                    published
                );
            }
        } catch (publishError) {
            if (await exists(outputRoot)) {
                try {
                    await renameAndSync(outputRoot, candidateRoot, renamePath);
                } catch (rollbackError) {
                    const failure = new AggregateError(
                        [publishError, rollbackError],
                        `generation publication: initial commit journal and rollback failed; candidate is at ${outputRoot}`
                    );
                    failure.preserveTransactionRoot = true;
                    failure.recoveryRoot = outputRoot;
                    throw failure;
                }
            }
            throw publishError;
        }
        return { cleanup_pending: false };
    }
    const backupRoot = resolve(dirname(candidateRoot), 'previous');
    try {
        await renameAndSync(outputRoot, backupRoot, renamePath);
    } catch (moveError) {
        const [outputStillExists, backupExists] = await Promise.all([
            exists(outputRoot),
            exists(backupRoot),
        ]);
        if (!outputStillExists && backupExists) {
            try {
                await renameAndSync(backupRoot, outputRoot, renamePath);
            } catch (rollbackError) {
                const failure = new AggregateError(
                    [moveError, rollbackError],
                    `generation publication: previous move and rollback failed; previous output remains at ${backupRoot}`
                );
                failure.preserveTransactionRoot = true;
                failure.recoveryRoot = backupRoot;
                throw failure;
            }
        } else if (backupExists) {
            const failure = new Error(
                `generation publication: ambiguous previous move; inspect ${backupRoot}`
            );
            failure.preserveTransactionRoot = true;
            failure.recoveryRoot = backupRoot;
            throw failure;
        }
        throw moveError;
    }
    if (journal) {
        try {
            journal = { ...journal, phase: 'previous-moved' };
            await writeTransactionJournal(dirname(candidateRoot), journal);
        } catch (journalError) {
            try {
                await renameAndSync(backupRoot, outputRoot, renamePath);
            } catch (rollbackError) {
                const failure = new AggregateError(
                    [journalError, rollbackError],
                    `generation publication: journal and rollback failed; previous output remains at ${backupRoot}`
                );
                failure.preserveTransactionRoot = true;
                failure.recoveryRoot = backupRoot;
                throw failure;
            }
            throw journalError;
        }
    }
    try {
        await renameAndSync(candidateRoot, outputRoot, renamePath);
    } catch (publishError) {
        try {
            await renameAndSync(backupRoot, outputRoot, renamePath);
        } catch (rollbackError) {
            const failure = new AggregateError(
                [publishError, rollbackError],
                `generation publication: commit and rollback failed; previous output remains at ${backupRoot}`
            );
            failure.preserveTransactionRoot = true;
            failure.recoveryRoot = backupRoot;
            throw failure;
        }
        throw publishError;
    }
    if (journal) {
        try {
            journal = { ...journal, phase: 'candidate-published' };
            await writeTransactionJournal(dirname(candidateRoot), journal);
        } catch (journalError) {
            try {
                await renameAndSync(outputRoot, candidateRoot, renamePath);
                await renameAndSync(backupRoot, outputRoot, renamePath);
            } catch (rollbackError) {
                const failure = new AggregateError(
                    [journalError, rollbackError],
                    `generation publication: published journal and rollback failed; previous output remains at ${backupRoot}`
                );
                failure.preserveTransactionRoot = true;
                failure.recoveryRoot = backupRoot;
                throw failure;
            }
            throw journalError;
        }
    }
    try {
        await removeTreeAndSync(backupRoot);
        return { cleanup_pending: false };
    } catch {
        return { cleanup_pending: true };
    }
}

export async function finishTransaction({
    transactionRoot,
    publication,
    operationError,
    preserveTransactionRoot,
}) {
    if (preserveTransactionRoot) {
        if (operationError) throw operationError;
        return {
            ...publication,
            recovery_pending: true,
            recovery_root: transactionRoot,
        };
    }
    try {
        await removeTreeAndSync(transactionRoot);
    } catch (cleanupError) {
        if (operationError) {
            throw new AggregateError(
                [operationError, cleanupError],
                `generation publication: operation and transaction cleanup failed; inspect ${transactionRoot}`
            );
        }
        return {
            ...publication,
            recovery_pending: true,
            recovery_root: transactionRoot,
        };
    }
    if (operationError) throw operationError;
    return publication;
}

export function buildTransactionJournal(outputRoot, changeSet, hadPrevious) {
    return {
        schema_version: '1.0.0',
        output_root: resolve(outputRoot),
        had_previous: hadPrevious,
        phase: 'prepared',
        change_set_id: changeSet.change_set_id,
        expected_control_manifest_sha256:
            changeSet.control_plane.desired_manifest_sha256,
        expected_target_manifest_sha256: Object.fromEntries(
            changeSet.targets.map(({ id, desired_manifest_sha256: hash }) => [
                id,
                hash,
            ])
        ),
    };
}

export async function prepareTransaction({
    outputRoot,
    changeSet,
    hadPrevious,
}) {
    const transactionRoot = await createTransactionRoot(outputRoot);
    const journal = buildTransactionJournal(outputRoot, changeSet, hadPrevious);
    await writeTransactionJournal(transactionRoot, journal);
    return { transactionRoot, journal };
}
