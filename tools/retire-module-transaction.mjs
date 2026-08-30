import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
    closeSync,
    fsyncSync,
    lstatSync,
    mkdirSync,
    openSync,
    readFileSync,
    readlinkSync,
    readdirSync,
    renameSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import { hostname } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';

import { retirementPlanSha256 } from './retire-module-plan.mjs';

export const TRANSACTION_RELATIVE_ROOT = '.cmz/retire-module-transactions';
const noop = () => undefined;

export function pathEntryExists(path) {
    try {
        lstatSync(path);
        return true;
    } catch (error) {
        if (error.code === 'ENOENT') return false;
        throw error;
    }
}

function transactionRoot(workspaceRoot) {
    return join(workspaceRoot, TRANSACTION_RELATIVE_ROOT);
}

export function moduleTransactionDir(workspaceRoot, moduleName) {
    return join(transactionRoot(workspaceRoot), moduleName);
}

export function moduleStatePath(workspaceRoot, moduleName) {
    return join(moduleTransactionDir(workspaceRoot, moduleName), 'state.json');
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

export function writeTransactionState(workspaceRoot, moduleName, state) {
    writeDocumentAtomic(
        moduleStatePath(workspaceRoot, moduleName),
        `${JSON.stringify(state, null, 2)}\n`
    );
}

export function readTransactionState(workspaceRoot, moduleName) {
    const path = moduleStatePath(workspaceRoot, moduleName);
    if (!pathEntryExists(path)) return null;
    const metadata = lstatSync(path);
    if (!metadata.isFile() || metadata.isSymbolicLink())
        throw new Error(
            `État de retrait non régulier ${relative(workspaceRoot, path)}.`
        );
    try {
        return JSON.parse(readFileSync(path, 'utf8'));
    } catch (error) {
        throw new Error(
            `État de retrait illisible ${relative(workspaceRoot, path)} : ${error.message}`
        );
    }
}

export function removeModuleTransaction(workspaceRoot, moduleName) {
    const path = moduleTransactionDir(workspaceRoot, moduleName);
    if (!pathEntryExists(path)) return;
    assertPlainDirectory(path, relative(workspaceRoot, path));
    rmSync(path, { recursive: true, force: true });
    syncDirectory(dirname(path));
}

export function assertPlainDirectory(path, label) {
    let metadata;
    try {
        metadata = lstatSync(path);
    } catch (error) {
        throw new Error(`${label} est inaccessible : ${error.message}`);
    }
    if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
        throw new Error(`${label} doit être un vrai dossier, jamais un lien.`);
    }
}

export function treeSha256(root) {
    assertPlainDirectory(root, root);
    const hash = createHash('sha256');

    function visit(path, relativePath) {
        const metadata = lstatSync(path);
        if (metadata.isSymbolicLink()) {
            hash.update(
                `L\0${relativePath}\0${metadata.mode & 0o777}\0${readlinkSync(path)}\0`
            );
            return;
        }
        if (metadata.isDirectory()) {
            hash.update(`D\0${relativePath}\0${metadata.mode & 0o777}\0`);
            for (const entry of readdirSync(path).sort()) {
                visit(join(path, entry), join(relativePath, entry));
            }
            return;
        }
        if (!metadata.isFile()) {
            throw new Error(
                `Fichier spécial interdit dans une transaction : ${path}`
            );
        }
        hash.update(
            `F\0${relativePath}\0${metadata.mode & 0o777}\0${metadata.size}\0`
        );
        hash.update(readFileSync(path));
        hash.update('\0');
    }

    visit(root, '.');
    return hash.digest('hex');
}

export function assertTreeSha256(root, expectedSha256, label) {
    const actual = treeSha256(root);
    if (actual !== expectedSha256) {
        throw new Error(
            `${label} ne correspond plus au journal : ${actual} != ${expectedSha256}`
        );
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
            `Verrou de retrait incomplet ${lockRoot} : ${error.message}`
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

function acquireTransactionLock(workspaceRoot, metadata) {
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

function releaseTransactionLock(lockRoot) {
    if (!pathEntryExists(lockRoot)) return;
    assertPlainDirectory(lockRoot, lockRoot);
    const parent = dirname(lockRoot);
    rmSync(lockRoot, { recursive: true, force: true });
    syncDirectory(parent);
}

export function assertTransactionStorageIgnored(workspaceRoot) {
    for (const path of [
        join(workspaceRoot, '.cmz'),
        join(workspaceRoot, TRANSACTION_RELATIVE_ROOT),
    ]) {
        if (pathEntryExists(path))
            assertPlainDirectory(path, relative(workspaceRoot, path));
    }
    const probe = join(TRANSACTION_RELATIVE_ROOT, '.gitignore-probe');
    let topLevel;
    try {
        topLevel = execFileSync('git', ['rev-parse', '--show-toplevel'], {
            cwd: workspaceRoot,
            encoding: 'utf8',
        }).trim();
    } catch {
        throw new Error(`Le retrait exige un worktree Git valide.`);
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
            `${TRANSACTION_RELATIVE_ROOT}/ doit être explicitement ignoré par Git.`
        );
    }
}

export function withTransactionLock(workspaceRoot, metadata, operation) {
    assertTransactionStorageIgnored(workspaceRoot);
    const lockRoot = acquireTransactionLock(workspaceRoot, metadata);
    try {
        return operation();
    } finally {
        releaseTransactionLock(lockRoot);
    }
}

export function safeWorkspacePath(workspaceRoot, relativePath) {
    if (
        typeof relativePath !== 'string' ||
        relativePath.startsWith('/') ||
        relativePath.split(/[\\/]/).includes('..')
    ) {
        throw new Error(`Chemin de transaction dangereux : ${relativePath}`);
    }
    const absolute = resolve(workspaceRoot, relativePath);
    if (!absolute.startsWith(`${resolve(workspaceRoot)}${sep}`)) {
        throw new Error(`Chemin hors workspace : ${relativePath}`);
    }
    return absolute;
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

function hasExactKeys(value, keys) {
    return (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        Object.keys(value).sort().join('\0') === [...keys].sort().join('\0')
    );
}

export function validateTransactionState(
    workspaceRoot,
    moduleName,
    state,
    { allowGitDrift = false } = {}
) {
    const expectedKeys = [
        'version',
        'module',
        'status',
        'startedAt',
        'workspaceRoot',
        'gitHead',
        'gitBranch',
        'packageJsonHashBefore',
        'plan',
        'planSha256',
        'roots',
        'rootSha256',
        'movedRoots',
        'historicalReferences',
        'activeReferences',
        'configReport',
        'configOriginals',
        'configOriginalSha256',
        'desiredConfigSha256',
        'tombstoneOriginal',
        'tombstoneOriginalSha256',
        'tombstoneCreatedSha256',
    ];
    if (
        !hasExactKeys(state, expectedKeys) ||
        state.version !== 8 ||
        state.module !== moduleName ||
        !['moving', 'awaiting-finalize'].includes(state.status) ||
        typeof state.startedAt !== 'string' ||
        Number.isNaN(Date.parse(state.startedAt)) ||
        resolve(state.workspaceRoot || '') !== resolve(workspaceRoot) ||
        !(state.gitHead === null || typeof state.gitHead === 'string') ||
        !(state.gitBranch === null || typeof state.gitBranch === 'string') ||
        !/^[a-f0-9]{64}$/.test(state.packageJsonHashBefore ?? '') ||
        !Array.isArray(state.roots) ||
        state.roots.length === 0 ||
        new Set(state.roots).size !== state.roots.length ||
        !Array.isArray(state.movedRoots) ||
        new Set(state.movedRoots).size !== state.movedRoots.length ||
        !Array.isArray(state.historicalReferences) ||
        !Array.isArray(state.activeReferences) ||
        new Set(state.historicalReferences).size !==
            state.historicalReferences.length ||
        new Set(state.activeReferences).size !==
            state.activeReferences.length ||
        [
            ...(state.historicalReferences || []),
            ...(state.activeReferences || []),
        ].some((specification) => {
            if (typeof specification !== 'string') return true;
            const parts = specification.split('::');
            return (
                parts.length !== 3 ||
                !parts[0] ||
                !/^[a-f0-9]{64}$/.test(parts[1] || '') ||
                !parts[2]?.trim()
            );
        }) ||
        !Array.isArray(state.configReport) ||
        !hasExactKeys(state.configOriginals, [
            'eslint.config.mjs',
            'tsconfig.base.json',
            'knip.json',
            'package.json',
            'bun.lock',
        ]) ||
        Object.values(state.configOriginals).some(
            (content) => typeof content !== 'string'
        ) ||
        !hasExactKeys(state.configOriginalSha256, [
            'eslint.config.mjs',
            'tsconfig.base.json',
            'knip.json',
            'package.json',
            'bun.lock',
        ]) ||
        Object.entries(state.configOriginals).some(
            ([file, content]) =>
                createHash('sha256')
                    .update(Buffer.from(content, 'base64'))
                    .digest('hex') !== state.configOriginalSha256[file]
        ) ||
        state.packageJsonHashBefore !==
            state.configOriginalSha256['package.json'] ||
        !hasExactKeys(state.desiredConfigSha256, [
            'eslint.config.mjs',
            'tsconfig.base.json',
            'knip.json',
            'package.json',
        ]) ||
        Object.values(state.desiredConfigSha256).some(
            (hash) => !/^[a-f0-9]{64}$/.test(hash)
        ) ||
        !(
            state.tombstoneOriginal === null ||
            typeof state.tombstoneOriginal === 'string'
        ) ||
        !(
            state.tombstoneOriginalSha256 === null ||
            /^[a-f0-9]{64}$/.test(state.tombstoneOriginalSha256)
        ) ||
        (state.tombstoneOriginal === null) !==
            (state.tombstoneOriginalSha256 === null) ||
        (typeof state.tombstoneOriginal === 'string' &&
            createHash('sha256')
                .update(Buffer.from(state.tombstoneOriginal, 'base64'))
                .digest('hex') !== state.tombstoneOriginalSha256) ||
        !(
            state.tombstoneCreatedSha256 === null ||
            /^[a-f0-9]{64}$/.test(state.tombstoneCreatedSha256)
        ) ||
        !hasExactKeys(state.plan, [
            'version',
            'module',
            'scopeTag',
            'projects',
            'roots',
        ]) ||
        state.plan.version !== 1 ||
        state.plan.module !== moduleName ||
        state.plan.scopeTag !== `scope:${moduleName}` ||
        !Array.isArray(state.plan.projects) ||
        state.plan.projects.length === 0 ||
        !Array.isArray(state.plan.roots) ||
        JSON.stringify(state.plan.roots) !== JSON.stringify(state.roots) ||
        JSON.stringify(state.roots) !==
            JSON.stringify([...state.roots].sort()) ||
        state.roots.some(
            (root) => !/^(apps|libs)\/[a-z0-9][a-z0-9._-]*$/.test(root)
        ) ||
        !/^[a-f0-9]{64}$/.test(state.planSha256 || '') ||
        retirementPlanSha256(state.plan) !== state.planSha256 ||
        state.plan.projects.some(
            (project) =>
                !hasExactKeys(project, ['name', 'projectJson', 'root']) ||
                typeof project.name !== 'string' ||
                project.name.length === 0 ||
                !/^(apps|libs)\/[a-z0-9][a-z0-9/._-]*\/project\.json$/.test(
                    project.projectJson
                ) ||
                !/^(apps|libs)\/[a-z0-9][a-z0-9/._-]*$/.test(project.root) ||
                project.projectJson !== `${project.root}/project.json` ||
                !state.roots.some(
                    (root) =>
                        project.root === root ||
                        project.root.startsWith(`${root}/`)
                )
        ) ||
        new Set(state.plan.projects.map((project) => project.name)).size !==
            state.plan.projects.length ||
        new Set(state.plan.projects.map((project) => project.projectJson))
            .size !== state.plan.projects.length ||
        JSON.stringify(state.plan.projects) !==
            JSON.stringify(
                [...state.plan.projects].sort((a, b) =>
                    a.projectJson < b.projectJson
                        ? -1
                        : a.projectJson > b.projectJson
                          ? 1
                          : 0
                )
            ) ||
        !hasExactKeys(state.rootSha256, state.roots) ||
        state.roots.some(
            (root) =>
                !/^(apps|libs)\/[a-z0-9][a-z0-9/._-]*$/.test(root) ||
                !/^[a-f0-9]{64}$/.test(state.rootSha256[root] || '')
        ) ||
        state.movedRoots.some((root) => !state.roots.includes(root))
    ) {
        throw new Error(`État de retrait invalide pour "${moduleName}".`);
    }
    for (const root of state.roots) safeWorkspacePath(workspaceRoot, root);

    if (!allowGitDrift) {
        const git = currentGitIdentity(workspaceRoot);
        if (state.gitHead !== git.head || state.gitBranch !== git.branch) {
            throw new Error(
                `HEAD ou branche a changé depuis le début du retrait ` +
                    `(${state.gitBranch || 'detached'}@${state.gitHead || 'sans-commit'} → ` +
                    `${git.branch || 'detached'}@${git.head || 'sans-commit'}). ` +
                    `Reviens au contexte initial ou utilise --abort.`
            );
        }
    }
    return state;
}

export function transactionRootPairs(workspaceRoot, moduleName, state) {
    return state.roots.map((relativeRoot) => ({
        relativeRoot,
        root: safeWorkspacePath(workspaceRoot, relativeRoot),
        backup: join(
            moduleTransactionDir(workspaceRoot, moduleName),
            'removed',
            relativeRoot
        ),
        expectedSha256: state.rootSha256[relativeRoot],
    }));
}

export function inspectTransactionRoot(pair) {
    const sourceExists = pathEntryExists(pair.root);
    const backupExists = pathEntryExists(pair.backup);
    if (sourceExists) assertPlainDirectory(pair.root, pair.relativeRoot);
    if (backupExists)
        assertPlainDirectory(pair.backup, `sauvegarde ${pair.relativeRoot}`);
    if (sourceExists && backupExists) {
        throw new Error(
            `État ambigu pour ${pair.relativeRoot} : source et sauvegarde existent simultanément.`
        );
    }
    if (!sourceExists && !backupExists) {
        throw new Error(
            `État irrécupérable pour ${pair.relativeRoot} : source et sauvegarde sont absentes.`
        );
    }
    const existingPath = sourceExists ? pair.root : pair.backup;
    assertTreeSha256(
        existingPath,
        pair.expectedSha256,
        sourceExists ? pair.relativeRoot : `sauvegarde ${pair.relativeRoot}`
    );
    return { sourceExists, backupExists };
}

export function moveTransactionRoots(
    workspaceRoot,
    moduleName,
    state,
    onMove = noop
) {
    const pairs = transactionRootPairs(workspaceRoot, moduleName, state);
    for (const pair of pairs) inspectTransactionRoot(pair);

    let nextState = state;
    for (const pair of pairs) {
        if (pathEntryExists(pair.backup)) continue;
        mkdirSync(dirname(pair.backup), { recursive: true });
        renameSync(pair.root, pair.backup);
        syncDirectory(dirname(pair.root));
        syncDirectory(dirname(pair.backup));
        assertTreeSha256(
            pair.backup,
            pair.expectedSha256,
            `sauvegarde ${pair.relativeRoot}`
        );
        nextState = {
            ...nextState,
            movedRoots: [
                ...new Set([...nextState.movedRoots, pair.relativeRoot]),
            ],
        };
        writeTransactionState(workspaceRoot, moduleName, nextState);
        onMove(pair.relativeRoot);
    }
    return nextState;
}

export function restoreTransactionRoots(
    workspaceRoot,
    moduleName,
    state,
    onRestore = noop
) {
    const pairs = transactionRootPairs(workspaceRoot, moduleName, state);
    for (const pair of pairs) inspectTransactionRoot(pair);

    for (const pair of [...pairs].reverse()) {
        if (!pathEntryExists(pair.backup)) continue;
        mkdirSync(dirname(pair.root), { recursive: true });
        renameSync(pair.backup, pair.root);
        syncDirectory(dirname(pair.root));
        syncDirectory(dirname(pair.backup));
        assertTreeSha256(pair.root, pair.expectedSha256, pair.relativeRoot);
        onRestore(pair.relativeRoot);
    }
}
