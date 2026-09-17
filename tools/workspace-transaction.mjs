import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
    closeSync,
    fsyncSync,
    lstatSync,
    mkdirSync,
    openSync,
    readFileSync,
    renameSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import { hostname } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';

// Keep the historical path so interrupted transactions remain recoverable.
export const MODULE_LIFECYCLE_TRANSACTION_ROOT =
    '.cmz/retire-module-transactions';

function pathEntryExists(path) {
    try {
        lstatSync(path);
        return true;
    } catch (error) {
        if (error.code === 'ENOENT') return false;
        throw error;
    }
}

function assertPlainDirectory(path, label) {
    let metadata;
    try {
        metadata = lstatSync(path);
    } catch (error) {
        throw new Error(`${label} est inaccessible : ${error.message}`, {
            cause: error,
        });
    }
    if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
        throw new Error(`${label} doit être un vrai dossier, jamais un lien.`);
    }
}

function syncDirectory(path) {
    const fd = openSync(path, 'r');
    try {
        fsyncSync(fd);
    } finally {
        closeSync(fd);
    }
}

function writeDocumentAtomic(path, content) {
    const parent = dirname(path);
    mkdirSync(parent, { recursive: true, mode: 0o700 });
    const temporaryPath = join(parent, `.tmp-${process.pid}-${randomUUID()}`);
    let fd;
    try {
        fd = openSync(temporaryPath, 'wx', 0o600);
        writeFileSync(fd, content);
        fsyncSync(fd);
        closeSync(fd);
        fd = undefined;
        renameSync(temporaryPath, path);
        syncDirectory(parent);
    } catch (error) {
        if (fd !== undefined) closeSync(fd);
        rmSync(temporaryPath, { force: true });
        throw error;
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

function readLockOwner(lockRoot) {
    assertPlainDirectory(lockRoot, lockRoot);
    let owner;
    try {
        owner = JSON.parse(readFileSync(join(lockRoot, 'owner.json'), 'utf8'));
    } catch (error) {
        throw new Error(
            `Verrou de cycle de vie incomplet ${lockRoot} : ${error.message}`,
            { cause: error }
        );
    }
    const keys = Object.keys(owner).sort().join('\0');
    if (
        keys !==
            ['command', 'hostname', 'module', 'pid', 'started_at', 'version']
                .sort()
                .join('\0') ||
        owner.version !== 1 ||
        !Number.isInteger(owner.pid) ||
        owner.pid <= 0 ||
        typeof owner.hostname !== 'string' ||
        typeof owner.started_at !== 'string' ||
        Number.isNaN(Date.parse(owner.started_at)) ||
        typeof owner.module !== 'string' ||
        typeof owner.command !== 'string'
    ) {
        throw new Error(`Propriétaire de verrou invalide : ${lockRoot}`);
    }
    return owner;
}

function transactionRoot(workspaceRoot) {
    return join(workspaceRoot, MODULE_LIFECYCLE_TRANSACTION_ROOT);
}

function acquireModuleLifecycleLock(workspaceRoot, metadata) {
    const root = transactionRoot(workspaceRoot);
    mkdirSync(root, { recursive: true, mode: 0o700 });
    const lockRoot = join(root, '.lock');

    for (let attempt = 0; attempt < 3; attempt += 1) {
        const contender = `${lockRoot}.contender-${randomUUID()}`;
        mkdirSync(contender, { mode: 0o700 });
        writeDocumentAtomic(
            join(contender, 'owner.json'),
            `${JSON.stringify(
                {
                    version: 1,
                    pid: process.pid,
                    hostname: hostname(),
                    started_at: new Date().toISOString(),
                    module: metadata.module,
                    command: metadata.command,
                },
                null,
                2
            )}\n`
        );
        syncDirectory(contender);
        try {
            renameSync(contender, lockRoot);
            syncDirectory(root);
            return lockRoot;
        } catch (error) {
            rmSync(contender, { recursive: true, force: true });
            if (!['EEXIST', 'ENOTEMPTY'].includes(error.code)) throw error;
        }

        const owner = readLockOwner(lockRoot);
        if (owner.hostname !== hostname() || processIsAlive(owner.pid)) {
            throw new Error(
                `Une autre opération de cycle de vie détient le verrou : ${JSON.stringify(owner)}`
            );
        }

        const staleRoot = `${lockRoot}.stale-${randomUUID()}`;
        try {
            renameSync(lockRoot, staleRoot);
            syncDirectory(root);
        } catch (error) {
            if (error.code === 'ENOENT') continue;
            throw error;
        }
        rmSync(staleRoot, { recursive: true, force: true });
        syncDirectory(root);
    }
    throw new Error(`Impossible d'acquérir le verrou global du cycle de vie.`);
}

function releaseModuleLifecycleLock(lockRoot) {
    if (!pathEntryExists(lockRoot)) return;
    assertPlainDirectory(lockRoot, lockRoot);
    const parent = dirname(lockRoot);
    rmSync(lockRoot, { recursive: true, force: true });
    syncDirectory(parent);
}

export function assertModuleLifecycleStorageIgnored(workspaceRoot) {
    for (const path of [
        join(workspaceRoot, '.cmz'),
        transactionRoot(workspaceRoot),
    ]) {
        if (pathEntryExists(path))
            assertPlainDirectory(path, relative(workspaceRoot, path));
    }
    const probe = join(MODULE_LIFECYCLE_TRANSACTION_ROOT, '.gitignore-probe');
    let topLevel;
    try {
        topLevel = execFileSync('git', ['rev-parse', '--show-toplevel'], {
            cwd: workspaceRoot,
            encoding: 'utf8',
        }).trim();
    } catch {
        throw new Error(`Le cycle de vie exige un worktree Git valide.`);
    }
    if (resolve(topLevel) !== resolve(workspaceRoot)) {
        throw new Error(`La racine Git ne correspond pas au workspace.`);
    }
    try {
        execFileSync('git', ['check-ignore', '--quiet', probe], {
            cwd: workspaceRoot,
            stdio: 'ignore',
        });
    } catch {
        throw new Error(
            `${MODULE_LIFECYCLE_TRANSACTION_ROOT}/ doit être explicitement ignoré par Git.`
        );
    }
}

export function withModuleLifecycleLock(workspaceRoot, metadata, operation) {
    assertModuleLifecycleStorageIgnored(workspaceRoot);
    const lockRoot = acquireModuleLifecycleLock(workspaceRoot, metadata);
    try {
        return operation();
    } finally {
        releaseModuleLifecycleLock(lockRoot);
    }
}

function gitValue(workspaceRoot, args) {
    try {
        return execFileSync('git', args, {
            cwd: workspaceRoot,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
        }).trim();
    } catch {
        return null;
    }
}

export function currentGitIdentity(workspaceRoot) {
    return {
        head: gitValue(workspaceRoot, ['rev-parse', 'HEAD']),
        branch: gitValue(workspaceRoot, ['branch', '--show-current']),
    };
}
