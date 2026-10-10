import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync, readlinkSync } from 'node:fs';
import { devNull } from 'node:os';
import { relative, resolve, sep } from 'node:path';

const COMMIT_SHA = /^[a-f0-9]{40}$/;
const MAX_ANCESTRY_COMMITS = 100_000;
const GIT_GLOBAL_ARGS = [
    '--no-replace-objects',
    '--no-lazy-fetch',
    '-c',
    'core.fileMode=true',
    '-c',
    'core.fsmonitor=false',
    '-c',
    'core.untrackedCache=false',
];

function hermeticGitEnvironment() {
    const env = Object.fromEntries(
        Object.entries(process.env).filter(([name]) => !name.startsWith('GIT_'))
    );
    return {
        ...env,
        LANG: 'C',
        LC_ALL: 'C',
        GIT_CONFIG_NOSYSTEM: '1',
        GIT_CONFIG_GLOBAL: devNull,
        GIT_TERMINAL_PROMPT: '0',
        GIT_OPTIONAL_LOCKS: '0',
        GIT_NO_LAZY_FETCH: '1',
    };
}

function fail(message) {
    throw new Error(`Git authority: ${message}`);
}

function git(root, args, encoding = 'utf8') {
    try {
        return execFileSync('git', [...GIT_GLOBAL_ARGS, ...args], {
            cwd: root,
            env: hermeticGitEnvironment(),
            encoding,
            maxBuffer: 32 * 1024 * 1024,
            stdio: ['ignore', 'pipe', 'pipe'],
        });
    } catch {
        fail(`git ${args[0]} failed`);
    }
}

function gitBlobBatch(root, oids) {
    if (oids.length === 0) return [];
    let output;
    try {
        output = execFileSync(
            'git',
            [...GIT_GLOBAL_ARGS, 'cat-file', '--batch'],
            {
                cwd: root,
                env: hermeticGitEnvironment(),
                input: `${oids.join('\n')}\n`,
                encoding: null,
                maxBuffer: 256 * 1024 * 1024,
                stdio: ['pipe', 'pipe', 'pipe'],
            }
        );
    } catch {
        fail('git cat-file --batch failed');
    }
    const contents = [];
    let offset = 0;
    for (const expectedOid of oids) {
        const newline = output.indexOf(0x0a, offset);
        if (newline === -1)
            fail('git cat-file --batch returned a truncated header');
        const header = output.subarray(offset, newline).toString('utf8');
        const match = /^([a-f0-9]{40,64}) blob ([0-9]+)$/.exec(header);
        if (!match || match[1] !== expectedOid)
            fail('git cat-file --batch returned an unexpected object');
        const size = Number(match[2]);
        const start = newline + 1;
        const end = start + size;
        if (end >= output.length || output[end] !== 0x0a)
            fail('git cat-file --batch returned a truncated blob');
        contents.push(output.subarray(start, end));
        offset = end + 1;
    }
    if (offset !== output.length)
        fail('git cat-file --batch returned trailing data');
    return contents;
}

export function normalizedWorkspacePath(root, declaredPath, label) {
    if (typeof declaredPath !== 'string')
        fail(`${label} must be a workspace-relative path`);
    const segments = declaredPath.split('/');
    if (
        declaredPath.startsWith('/') ||
        declaredPath.includes('\\') ||
        segments.some(
            (segment) => segment === '' || segment === '.' || segment === '..'
        )
    ) {
        fail(`${label} must use a normalized workspace-relative path`);
    }
    const absolute = resolve(root, declaredPath);
    const rel = relative(root, absolute);
    if (!rel || rel === '..' || rel.startsWith(`..${sep}`))
        fail(`${label} must be inside the workspace`);
    return rel.split(sep).join('/');
}

export function assertGitCommit(root, commitSha, label) {
    if (!COMMIT_SHA.test(commitSha ?? ''))
        fail(`${label} must be a full lowercase commit SHA`);
    const type = git(root, ['cat-file', '-t', commitSha]).trim();
    if (type !== 'commit') fail(`${label} must identify a Git commit`);
    return commitSha;
}

export function gitHead(root) {
    return git(root, ['rev-parse', '--verify', 'HEAD']).trim();
}

function assertNoMaskedIndexEntries(root) {
    const entries = git(root, ['ls-files', '-v', '-z'], 'utf8')
        .split('\0')
        .filter(Boolean);
    const masked = entries.filter(
        (entry) => entry.startsWith('S ') || /^[a-z] /.test(entry)
    );
    if (masked.length > 0) {
        fail(
            `candidate index must not use skip-worktree or assume-unchanged: ${masked
                .map((entry) => entry.slice(2))
                .join(', ')}`
        );
    }
}

export function assertCleanGitWorktree(root) {
    if (changedPaths(root, gitHead(root)).length > 0)
        fail('v5 preparation requires a clean Git worktree and index');
}

export function assertRawCommitAncestor(
    ancestorSha,
    descendantSha,
    readCommit,
    maxCommits = MAX_ANCESTRY_COMMITS
) {
    if (!COMMIT_SHA.test(ancestorSha ?? ''))
        fail('base_commit_sha must be a full lowercase commit SHA');
    if (!COMMIT_SHA.test(descendantSha ?? ''))
        fail('candidate commit must be a full lowercase commit SHA');
    if (typeof readCommit !== 'function')
        fail('raw commit reader must be a function');
    if (!Number.isSafeInteger(maxCommits) || maxCommits < 1)
        fail('raw commit traversal limit must be a positive safe integer');
    const pending = [descendantSha];
    const seen = new Set();
    while (pending.length > 0) {
        const current = pending.pop();
        if (current === ancestorSha) return;
        if (seen.has(current)) continue;
        seen.add(current);
        if (seen.size > maxCommits)
            fail(`commit ancestry exceeds ${maxCommits} raw objects`);
        const rawCommit = readCommit(current);
        if (typeof rawCommit !== 'string')
            fail('raw commit reader must return text');
        const headerEnd = rawCommit.indexOf('\n\n');
        if (headerEnd === -1)
            fail('candidate commit contains an invalid header');
        const header = rawCommit.slice(0, headerEnd);
        for (const line of header.split('\n')) {
            if (!line.startsWith('parent ')) continue;
            const parent = line.slice('parent '.length);
            if (!COMMIT_SHA.test(parent))
                fail('candidate commit contains an invalid parent identity');
            if (!seen.has(parent)) pending.push(parent);
        }
    }
    fail('base_commit_sha must be an ancestor of the candidate HEAD');
}

export function assertGitAncestor(root, ancestorSha, descendant = 'HEAD') {
    assertGitCommit(root, ancestorSha, 'base_commit_sha');
    const descendantSha = assertGitCommit(
        root,
        descendant === 'HEAD' ? gitHead(root) : descendant,
        'candidate commit'
    );
    assertRawCommitAncestor(ancestorSha, descendantSha, (commitSha) =>
        git(root, ['cat-file', 'commit', commitSha])
    );
}

function parseTreeEntry(output, expectedPath, label) {
    const entries = output.split('\0').filter(Boolean);
    if (entries.length !== 1)
        fail(`${label} is absent from the authority commit`);
    const match = /^(\d{6}) ([^ ]+) ([a-f0-9]{40,64})\t(.+)$/.exec(entries[0]);
    if (!match || match[4] !== expectedPath)
        fail(`${label} has an ambiguous Git tree entry`);
    const [, mode, type, oid] = match;
    if (type !== 'blob') fail(`${label} must be a Git blob, received ${type}`);
    if (mode === '120000') fail(`${label} must not be a symbolic link`);
    if (mode !== '100644' && mode !== '100755')
        fail(`${label} has unsupported Git mode ${mode}`);
    return { mode, oid };
}

function optionalTreeEntry(root, commitSha, path, label) {
    const output = git(root, ['ls-tree', '-z', commitSha, '--', path]);
    if (output.length === 0) return null;
    return parseTreeEntry(output, path, label);
}

// Compare une entrée de l'arbre Git au disque réel : type final, bit
// exécutable et octets. Ne consulte ni l'index, ni la configuration, ni les
// filtres : `git diff` dit si Git considère un fichier comme modifié, pas si
// ses octets sont ceux du commit.
function worktreeDifference(root, { path, kind, mode, content }) {
    const absolute = resolve(root, path);
    const stat = lstatSync(absolute, { throwIfNoEntry: false });
    if (!stat) return 'missing';
    if (kind === 'symlink') {
        return stat.isSymbolicLink() &&
            readlinkSync(absolute, { encoding: 'buffer' }).equals(content)
            ? null
            : 'link';
    }
    if (!stat.isFile()) return 'type';
    if (
        process.platform !== 'win32' &&
        ((stat.mode & 0o111) !== 0) !== (mode === '100755')
    ) {
        return 'mode';
    }
    return readFileSync(absolute).equals(content) ? null : 'content';
}

export function createGitCommitReader(root, commitSha) {
    assertGitCommit(root, commitSha, 'authority commit');
    return (declaredPath, label = declaredPath) => {
        const path = normalizedWorkspacePath(root, declaredPath, label);
        const entry = parseTreeEntry(
            git(root, ['ls-tree', '-z', commitSha, '--', path]),
            path,
            label
        );
        const content = git(root, ['cat-file', 'blob', entry.oid], null);
        return { path, mode: entry.mode, oid: entry.oid, content };
    };
}

export function assertAllowedPathsMatchGitCommit(
    root,
    commitSha,
    declaredPaths
) {
    const reader = createGitCommitReader(root, commitSha);
    for (const declaredPath of declaredPaths) {
        const path = normalizedWorkspacePath(
            root,
            declaredPath,
            'allowed file'
        );
        const expected = optionalTreeEntry(
            root,
            commitSha,
            path,
            `allowed file ${path}`
        );
        if (!expected) {
            if (lstatSync(resolve(root, path), { throwIfNoEntry: false }))
                fail(`allowed file ${path} existed before the work order`);
            continue;
        }
        const difference = worktreeDifference(root, {
            path,
            kind: 'file',
            mode: expected.mode,
            content: reader(path, path).content,
        });
        if (difference === 'mode' || difference === 'content')
            fail(
                `allowed file ${path} ${difference} differs from the base commit`
            );
        if (difference)
            fail(`allowed file ${path} differs from the base commit`);
    }
}

// `inventory` vient de `gitCommitInventory` : toutes les entrées de la base
// hors allowlist, avec leur contenu. Tout écart du disque échoue avant les
// oracles, quel que soit l'état que Git en rapporte.
export function assertProtectedWorktreeMatchesGitCommit(root, inventory) {
    const differences = inventory.flatMap((entry) => {
        const difference = worktreeDifference(root, entry);
        return difference ? [`${entry.path} (${difference})`] : [];
    });
    if (differences.length > 0) {
        const shown = differences.slice(0, 20).join(', ');
        const hidden = differences.length - 20;
        fail(
            `protected worktree differs from base_commit_sha: ${shown}${
                hidden > 0 ? ` and ${hidden} more` : ''
            }`
        );
    }
}

export function gitCommitInventory(root, commitSha, excludedPaths) {
    assertGitCommit(root, commitSha, 'base commit');
    const excluded = new Set(
        excludedPaths.map((path) =>
            normalizedWorkspacePath(root, path, 'allowed file')
        )
    );
    const output = git(
        root,
        ['ls-tree', '-r', '-z', '--full-tree', commitSha],
        'utf8'
    );
    const entries = output
        .split('\0')
        .filter(Boolean)
        .map((entry) => {
            const match = /^(\d{6}) ([^ ]+) ([a-f0-9]{40,64})\t(.+)$/.exec(
                entry
            );
            if (!match) fail('base commit contains an invalid tree entry');
            const [, mode, type, oid, path] = match;
            if (excluded.has(path)) return null;
            if (type !== 'blob')
                fail(`base commit contains unsupported ${type}: ${path}`);
            if (mode !== '100644' && mode !== '100755' && mode !== '120000')
                fail(`base commit contains unsupported mode ${mode}: ${path}`);
            return {
                path,
                kind: mode === '120000' ? 'symlink' : 'file',
                mode,
                oid,
            };
        })
        .filter(Boolean);
    const contents = gitBlobBatch(
        root,
        entries.map(({ oid }) => oid)
    );
    return entries.map(({ oid: _oid, ...entry }, index) => ({
        ...entry,
        content: contents[index],
    }));
}

function changedPaths(root, baseCommitSha) {
    assertNoMaskedIndexEntries(root);
    const changed = git(
        root,
        [
            'diff',
            '--name-only',
            '--no-renames',
            '--no-ext-diff',
            '--no-textconv',
            '-z',
            baseCommitSha,
            '--',
        ],
        'utf8'
    )
        .split('\0')
        .filter(Boolean);
    const untracked = git(
        root,
        ['ls-files', '-z', '--others', '--exclude-per-directory=.gitignore'],
        'utf8'
    )
        .split('\0')
        .filter(Boolean);
    return [...new Set([...changed, ...untracked])].sort();
}

export function assertOnlyAllowedGitChanges(root, baseCommitSha, allowedPaths) {
    const allowed = new Set(
        allowedPaths.map((path) =>
            normalizedWorkspacePath(root, path, 'allowed file')
        )
    );
    const forbidden = changedPaths(root, baseCommitSha).filter(
        (path) => !allowed.has(path)
    );
    if (forbidden.length > 0)
        fail(`candidate changed protected paths: ${forbidden.join(', ')}`);
}
