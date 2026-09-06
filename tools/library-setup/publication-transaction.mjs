import { createHash, randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
    closeSync,
    constants,
    existsSync,
    fsyncSync,
    lstatSync,
    openSync,
    readFileSync,
    realpathSync,
    renameSync,
    unlinkSync,
    writeFileSync,
} from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { hostname } from 'node:os';

function fail(message) {
    throw new Error(`library publication: ${message}`);
}

function git(repository, args, { input, env = {} } = {}) {
    try {
        return execFileSync(
            'git',
            [
                '-C',
                repository,
                '--no-replace-objects',
                '--no-lazy-fetch',
                ...args,
            ],
            {
                input,
                encoding: 'utf8',
                env: {
                    PATH: process.env.PATH,
                    LANG: 'C',
                    LC_ALL: 'C',
                    GIT_CONFIG_NOSYSTEM: '1',
                    GIT_CONFIG_GLOBAL: '/dev/null',
                    GIT_CONFIG_SYSTEM: '/dev/null',
                    GIT_OPTIONAL_LOCKS: '0',
                    ...env,
                },
                stdio: ['pipe', 'pipe', 'pipe'],
            }
        ).trim();
    } catch (error) {
        fail(
            `git ${args[0]} a échoué : ${String(error.stderr ?? error.message).trim()}`
        );
    }
}

function gitRaw(repository, args) {
    try {
        return execFileSync(
            'git',
            [
                '-C',
                repository,
                '--no-replace-objects',
                '--no-lazy-fetch',
                ...args,
            ],
            {
                encoding: 'buffer',
                env: {
                    PATH: process.env.PATH,
                    LANG: 'C',
                    LC_ALL: 'C',
                    GIT_CONFIG_NOSYSTEM: '1',
                    GIT_CONFIG_GLOBAL: '/dev/null',
                    GIT_CONFIG_SYSTEM: '/dev/null',
                },
                stdio: ['ignore', 'pipe', 'pipe'],
            }
        );
    } catch (error) {
        fail(
            `git ${args[0]} a échoué : ${String(error.stderr ?? error.message).trim()}`
        );
    }
}

function processStart(pid) {
    try {
        return execFileSync('ps', ['-o', 'lstart=', '-p', String(pid)], {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
        }).trim();
    } catch {
        return '';
    }
}

function gitDirectory(repository) {
    const dotGit = resolve(repository, '.git');
    const stats = lstatSync(dotGit);
    if (
        stats.isSymbolicLink() ||
        !stats.isDirectory() ||
        realpathSync(dotGit) !== dotGit
    ) {
        fail('.git doit être un vrai répertoire canonique en V1');
    }
    return dotGit;
}

function writeAtomic(path, content) {
    const temporary = `${path}.${randomBytes(8).toString('hex')}.tmp`;
    const fd = openSync(
        temporary,
        constants.O_CREAT |
            constants.O_EXCL |
            constants.O_WRONLY |
            (constants.O_NOFOLLOW ?? 0),
        0o600
    );
    try {
        writeFileSync(fd, content);
        fsyncSync(fd);
    } finally {
        closeSync(fd);
    }
    renameSync(temporary, path);
    syncDirectory(dirname(path));
}

function syncDirectory(path) {
    const fd = openSync(path, constants.O_RDONLY);
    try {
        fsyncSync(fd);
    } finally {
        closeSync(fd);
    }
}

function document(value) {
    return `${JSON.stringify(value)}\n`;
}

function readDocument(path) {
    const stats = lstatSync(path);
    if (
        stats.isSymbolicLink() ||
        !stats.isFile() ||
        (typeof process.getuid === 'function' &&
            stats.uid !== process.getuid()) ||
        (stats.mode & 0o777) !== 0o600
    )
        fail(`${basename(path)} non régulier`);
    return JSON.parse(readFileSync(path, 'utf8'));
}

function exactKeys(value, keys) {
    return (
        value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        Object.keys(value).sort().join('\0') === [...keys].sort().join('\0')
    );
}

function validateLock(lock) {
    if (
        !exactKeys(lock, [
            'schema_version',
            'pid',
            'started_at',
            'hostname',
            'uid',
        ]) ||
        lock.schema_version !== '1.0.0' ||
        !Number.isInteger(lock.pid) ||
        lock.pid <= 0 ||
        typeof lock.started_at !== 'string' ||
        !lock.started_at ||
        typeof lock.hostname !== 'string' ||
        !lock.hostname ||
        lock.uid !==
            (typeof process.getuid === 'function' ? process.getuid() : null)
    ) {
        fail('verrou invalide');
    }
    return lock;
}

function validateJournal(journal) {
    if (
        !exactKeys(journal, [
            'schema_version',
            'phase',
            'base_commit',
            'candidate_commit',
            'branch',
            'transaction_ref',
            'plan_id',
            'changes',
        ]) ||
        journal.schema_version !== '1.0.0' ||
        ![
            'prepared',
            'worktree-published',
            'index-published',
            'ref-published',
        ].includes(journal.phase) ||
        !/^[a-f0-9]{40,64}$/.test(journal.base_commit ?? '') ||
        !/^[a-f0-9]{40,64}$/.test(journal.candidate_commit ?? '') ||
        journal.base_commit.length !== journal.candidate_commit.length ||
        !/^refs\/heads\/[A-Za-z0-9._/-]+$/.test(journal.branch ?? '') ||
        !/^library-plan:[a-f0-9]{64}$/.test(journal.plan_id ?? '') ||
        journal.transaction_ref !==
            `refs/cmz/library-transactions/${journal.plan_id.slice('library-plan:'.length)}` ||
        !Array.isArray(journal.changes) ||
        journal.changes.length === 0
    ) {
        fail('journal de publication invalide');
    }
    for (const change of journal.changes) {
        if (
            !['create', 'modify'].includes(change.op) ||
            typeof change.path !== 'string' ||
            !['100644', '100755'].includes(change.mode) ||
            !/^[a-f0-9]{64}$/.test(change.sha256_after ?? '') ||
            (change.op === 'modify' &&
                !/^[a-f0-9]{64}$/.test(change.sha256_before ?? ''))
        ) {
            fail('changement journalisé invalide');
        }
    }
    return journal;
}

function controlPaths(repository) {
    const root = gitDirectory(repository);
    return {
        lock: join(root, 'cmz-library.lock'),
        journal: join(root, 'cmz-library-transaction.json'),
    };
}

function unlinkDurable(path) {
    unlinkSync(path);
    syncDirectory(dirname(path));
}

function acquireLock(repository, processProbe) {
    const paths = controlPaths(repository);
    const startedAt = processProbe(process.pid);
    if (!startedAt) fail('instant de démarrage du processus introuvable');
    const lockDocument = {
        schema_version: '1.0.0',
        pid: process.pid,
        started_at: startedAt,
        hostname: hostname(),
        uid: typeof process.getuid === 'function' ? process.getuid() : null,
    };
    const fd = openSync(
        paths.lock,
        constants.O_CREAT |
            constants.O_EXCL |
            constants.O_WRONLY |
            (constants.O_NOFOLLOW ?? 0),
        0o600
    );
    try {
        writeFileSync(fd, document(lockDocument));
        fsyncSync(fd);
    } finally {
        closeSync(fd);
    }
    return { ...paths, lockDocument };
}

function safeWorktreePath(repository, path) {
    if (
        typeof path !== 'string' ||
        path.startsWith('/') ||
        path.includes('\\') ||
        path.split('/').some((part) => !part || part === '.' || part === '..')
    ) {
        fail(`chemin publié invalide : ${path}`);
    }
    const target = resolve(repository, ...path.split('/'));
    const rel = relative(resolve(repository), target);
    if (rel === '..' || rel.startsWith(`..${sep}`))
        fail(`chemin hors dépôt : ${path}`);
    let parent = dirname(target);
    while (parent !== resolve(repository)) {
        const stats = lstatSync(parent);
        if (stats.isSymbolicLink() || !stats.isDirectory())
            fail(`parent non régulier : ${path}`);
        parent = dirname(parent);
    }
    return target;
}

function sha256(content) {
    return createHash('sha256').update(content).digest('hex');
}

function fileMode(stats) {
    return stats.mode & 0o111 ? '100755' : '100644';
}

function targetState(path) {
    if (!existsSync(path)) return { kind: 'absent' };
    const stats = lstatSync(path);
    if (stats.isSymbolicLink() || !stats.isFile()) {
        return { kind: 'ambiguous' };
    }
    return {
        kind: 'file',
        mode: fileMode(stats),
        sha256: sha256(readFileSync(path)),
    };
}

function gitPaths(repository, args) {
    const raw = git(repository, [...args, '-z']);
    return raw ? raw.split('\0').filter(Boolean) : [];
}

function assertNoUnrelatedWorkspaceChanges(repository, journal) {
    const expected = new Set(journal.changes.map(({ path }) => path));
    for (const change of journal.changes) {
        expected.add(
            relative(
                repository,
                publishedTemporary(join(repository, change.path))
            )
        );
    }
    const observed = new Set([
        ...gitPaths(repository, ['diff', '--name-only']),
        ...gitPaths(repository, ['diff', '--cached', '--name-only', 'HEAD']),
        ...gitPaths(repository, ['ls-files', '--others', '--exclude-standard']),
    ]);
    const unrelated = [...observed]
        .filter((path) => !expected.has(path))
        .sort();
    if (unrelated.length) {
        fail(
            `récupération refuse des changements étrangers : ${unrelated.join(', ')}`
        );
    }
}

function candidateContent(repository, candidate, change) {
    const path = safeWorktreePath(repository, change.path);
    const candidatePath = resolve(candidate, ...change.path.split('/'));
    const rel = relative(resolve(candidate), candidatePath);
    if (rel === '..' || rel.startsWith(`..${sep}`))
        fail('candidat hors racine');
    const stats = lstatSync(candidatePath);
    if (stats.isSymbolicLink() || !stats.isFile())
        fail(`${change.path}: sortie non régulière`);
    const mode = stats.mode & 0o111 ? '100755' : '100644';
    const content = readFileSync(candidatePath);
    if (mode !== change.mode || sha256(content) !== change.sha256_after) {
        fail(`${change.path}: contenu candidat différent du change-set`);
    }
    return { path, content, mode };
}

export function assertPublishableRepository(repository, expectedCommit) {
    if (
        git(repository, [
            'status',
            '--porcelain=v1',
            '-z',
            '--untracked-files=all',
        ]) !== ''
    ) {
        fail('dépôt entièrement propre requis');
    }
    const head = git(repository, ['rev-parse', '--verify', 'HEAD']);
    if (head !== expectedCommit)
        fail(`HEAD ${head} différent du commit candidat ${expectedCommit}`);
    const branch = git(repository, ['symbolic-ref', '-q', 'HEAD']);
    if (!branch.startsWith('refs/heads/'))
        fail('branche locale attachée requise');
    return { head, branch };
}

export function createCandidateCommit({
    repository,
    candidate,
    baseCommit,
    changeSet,
    message,
}) {
    if (!/^changes:[a-f0-9]{64}$/.test(changeSet.change_set_id ?? ''))
        fail('change-set invalide');
    if (!changeSet.changes.length) fail('change-set vide');
    if (
        changeSet.changes.some(
            ({ op, mode }) =>
                !['create', 'modify'].includes(op) ||
                !['100644', '100755'].includes(mode)
        )
    ) {
        fail(
            'V1 publie uniquement créations/modifications de fichiers réguliers'
        );
    }
    const index = join(
        dirname(candidate),
        `.cmz-index-${randomBytes(8).toString('hex')}`
    );
    const env = { GIT_INDEX_FILE: index };
    try {
        git(repository, ['read-tree', baseCommit], { env });
        for (const change of changeSet.changes) {
            const item = candidateContent(repository, candidate, change);
            const oid = git(repository, ['hash-object', '-w', '--stdin'], {
                input: item.content,
            });
            git(
                repository,
                [
                    'update-index',
                    '--add',
                    '--cacheinfo',
                    `${item.mode},${oid},${change.path}`,
                ],
                { env }
            );
        }
        const tree = git(repository, ['write-tree'], { env });
        const commit = git(repository, [
            'commit-tree',
            tree,
            '-p',
            baseCommit,
            '-m',
            message,
        ]);
        return { commit, tree };
    } finally {
        if (existsSync(index)) unlinkSync(index);
    }
}

function restoreBase(repository, journal) {
    assertNoUnrelatedWorkspaceChanges(repository, journal);
    for (const change of journal.changes) {
        const target = safeWorktreePath(repository, change.path);
        const temporary = publishedTemporary(target);
        if (existsSync(temporary)) {
            const state = targetState(temporary);
            if (
                state.kind !== 'file' ||
                state.mode !== change.mode ||
                state.sha256 !== change.sha256_after
            ) {
                fail(`temporaire de publication ambigu : ${change.path}`);
            }
            unlinkDurable(temporary);
        }
        const state = targetState(target);
        if (change.op === 'create') {
            if (state.kind === 'absent') continue;
            if (
                state.kind !== 'file' ||
                state.mode !== change.mode ||
                state.sha256 !== change.sha256_after
            ) {
                fail(
                    `restauration refuse une création divergente : ${change.path}`
                );
            }
            unlinkDurable(target);
        } else {
            const content = gitRaw(repository, [
                'cat-file',
                'blob',
                `${journal.base_commit}:${change.path}`,
            ]);
            const record = git(repository, [
                'ls-tree',
                journal.base_commit,
                '--',
                change.path,
            ]);
            const mode = record.split(' ')[0];
            if (!['100644', '100755'].includes(mode)) {
                fail(`mode de base non publiable : ${change.path}`);
            }
            if (sha256(content) !== change.sha256_before) {
                fail(`blob de base différent du journal : ${change.path}`);
            }
            if (
                state.kind === 'file' &&
                state.mode === mode &&
                state.sha256 === change.sha256_before
            ) {
                continue;
            }
            if (
                state.kind !== 'file' ||
                state.mode !== change.mode ||
                state.sha256 !== change.sha256_after
            ) {
                fail(
                    `restauration refuse une modification divergente : ${change.path}`
                );
            }
            writePublishedFile(target, content, mode);
        }
    }
    git(repository, ['read-tree', journal.base_commit]);
}

function publishedTemporary(target) {
    return join(dirname(target), `.${basename(target)}.cmz-publish`);
}

function writePublishedFile(target, content, mode) {
    if (existsSync(target)) {
        const stats = lstatSync(target);
        if (stats.isSymbolicLink() || !stats.isFile())
            fail(`cible de publication ambiguë : ${target}`);
    }
    const temporary = publishedTemporary(target);
    const fd = openSync(
        temporary,
        constants.O_CREAT |
            constants.O_EXCL |
            constants.O_WRONLY |
            (constants.O_NOFOLLOW ?? 0),
        mode === '100755' ? 0o755 : 0o644
    );
    try {
        writeFileSync(fd, content);
        fsyncSync(fd);
    } finally {
        closeSync(fd);
    }
    renameSync(temporary, target);
    syncDirectory(dirname(target));
}

export function recoverLibraryPublication(
    repository,
    { processProbe = processStart } = {}
) {
    const paths = controlPaths(repository);
    if (!existsSync(paths.lock)) {
        if (existsSync(paths.journal)) {
            fail('journal de publication présent sans verrou');
        }
        return { action: 'none' };
    }
    const lock = validateLock(readDocument(paths.lock));
    if (lock.hostname !== hostname())
        fail('publication active sur un autre hôte');
    if (processProbe(lock.pid) === lock.started_at)
        fail('une publication est déjà active');
    if (!existsSync(paths.journal)) {
        unlinkDurable(paths.lock);
        return { action: 'released-stale-lock' };
    }
    const journal = validateJournal(readDocument(paths.journal));
    const current = git(repository, ['rev-parse', '--verify', journal.branch]);
    if (current === journal.candidate_commit) {
        if (
            git(repository, [
                'status',
                '--porcelain=v1',
                '-z',
                '--untracked-files=all',
            ]) !== ''
        ) {
            fail('commit candidat publié mais worktree ou index divergent');
        }
        git(repository, ['read-tree', journal.candidate_commit]);
    } else if (current === journal.base_commit) {
        restoreBase(repository, journal);
    } else {
        fail('branche déplacée hors de la transaction ; récupération refusée');
    }
    git(repository, [
        'update-ref',
        '-d',
        journal.transaction_ref,
        journal.candidate_commit,
    ]);
    unlinkDurable(paths.journal);
    unlinkDurable(paths.lock);
    return {
        action:
            current === journal.candidate_commit ? 'completed' : 'rolled-back',
    };
}

export function publishCandidateCommit({
    repository,
    candidate,
    baseCommit,
    candidateCommit,
    changeSet,
    planId,
    processProbe = processStart,
    afterPhase = () => undefined,
}) {
    recoverLibraryPublication(repository, { processProbe });
    const { branch } = assertPublishableRepository(repository, baseCommit);
    const control = acquireLock(repository, processProbe);
    const transactionRef = `refs/cmz/library-transactions/${planId.replace('library-plan:', '')}`;
    const journal = {
        schema_version: '1.0.0',
        phase: 'prepared',
        base_commit: baseCommit,
        candidate_commit: candidateCommit,
        branch,
        transaction_ref: transactionRef,
        plan_id: planId,
        changes: changeSet.changes,
    };
    try {
        git(repository, [
            'update-ref',
            transactionRef,
            candidateCommit,
            '0'.repeat(baseCommit.length),
        ]);
        writeAtomic(control.journal, document(journal));
        afterPhase('prepared');
        for (const change of changeSet.changes) {
            const item = candidateContent(repository, candidate, change);
            writePublishedFile(item.path, item.content, item.mode);
        }
        journal.phase = 'worktree-published';
        writeAtomic(control.journal, document(journal));
        afterPhase(journal.phase);
        git(repository, ['read-tree', candidateCommit]);
        journal.phase = 'index-published';
        writeAtomic(control.journal, document(journal));
        afterPhase(journal.phase);
        git(repository, ['update-ref', branch, candidateCommit, baseCommit]);
        journal.phase = 'ref-published';
        writeAtomic(control.journal, document(journal));
        afterPhase(journal.phase);
        git(repository, ['update-ref', '-d', transactionRef, candidateCommit]);
        unlinkDurable(control.journal);
        unlinkDurable(control.lock);
        return { commit: candidateCommit, branch };
    } catch (error) {
        try {
            recoverLibraryPublication(repository, { processProbe: () => '' });
        } catch (recoveryError) {
            error.recoveryError = recoveryError;
        }
        throw error;
    }
}
