import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
    chmod,
    mkdir,
    mkdtemp,
    readFile,
    rm,
    symlink,
    writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
    assertAllowedPathsMatchGitCommit,
    assertCleanGitWorktree,
    assertGitAncestor,
    assertGitCommit,
    assertOnlyAllowedGitChanges,
    assertRawCommitAncestor,
    createGitCommitReader,
    gitCommitInventory,
    normalizedWorkspacePath,
} from './core/git-object-reader.mjs';

async function fixture(t) {
    const root = await mkdtemp(join(tmpdir(), 'git-authority-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    await mkdir(join(root, 'authority'));
    await writeFile(join(root, 'authority/source.json'), '{"safe":true}\n');
    await symlink('source.json', join(root, 'authority/link.json'));
    execFileSync('git', ['init', '-q'], { cwd: root });
    execFileSync('git', ['config', 'user.name', 'CMZ test'], { cwd: root });
    execFileSync('git', ['config', 'user.email', 'cmz-test@example.invalid'], {
        cwd: root,
    });
    execFileSync('git', ['add', '.'], { cwd: root });
    execFileSync('git', ['commit', '-qm', 'fixture'], { cwd: root });
    const head = execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: root,
        encoding: 'utf8',
    }).trim();
    return { root, head };
}

test('protège un symlink du baseline sans jamais le suivre comme autorité', async (t) => {
    const { root, head } = await fixture(t);
    const inventory = gitCommitInventory(root, head, []);
    const link = inventory.find(({ path }) => path === 'authority/link.json');
    assert.deepEqual(
        {
            kind: link.kind,
            mode: link.mode,
            target: link.content.toString('utf8'),
        },
        { kind: 'symlink', mode: '120000', target: 'source.json' }
    );
    assert.throws(
        () =>
            createGitCommitReader(root, head)('authority/link.json', 'source'),
        /source must not be a symbolic link/
    );
});

test('refuse chemins non canoniques, objets non commit et worktree sale', async (t) => {
    const { root, head } = await fixture(t);
    for (const path of [
        '/authority/source.json',
        '../source.json',
        './authority/source.json',
        'authority//source.json',
        'authority\\source.json',
    ]) {
        assert.throws(
            () => normalizedWorkspacePath(root, path, 'source'),
            /normalized workspace-relative path|inside the workspace/
        );
    }
    const blob = execFileSync(
        'git',
        ['rev-parse', `${head}:authority/source.json`],
        { cwd: root, encoding: 'utf8' }
    ).trim();
    assert.throws(
        () => assertGitCommit(root, blob, 'authority_commit_sha'),
        /must identify a Git commit/
    );
    await writeFile(join(root, 'untracked.txt'), 'dirty\n');
    assert.throws(
        () => assertCleanGitWorktree(root),
        /requires a clean Git worktree and index/
    );
});

test('détecte les deux côtés d’un renommage vers un chemin autorisé', async (t) => {
    const { root, head } = await fixture(t);
    await mkdir(join(root, 'page'));
    execFileSync(
        'git',
        ['mv', 'authority/source.json', 'page/page.extra.component.ts'],
        { cwd: root }
    );
    assert.throws(
        () =>
            assertOnlyAllowedGitChanges(root, head, [
                'page/page.extra.component.ts',
            ]),
        /candidate changed protected paths: authority\/source.json/
    );
});

for (const flag of ['--assume-unchanged', '--skip-worktree']) {
    test(`refuse le masquage d’index ${flag}`, async (t) => {
        const { root, head } = await fixture(t);
        execFileSync('git', ['update-index', flag, 'authority/source.json'], {
            cwd: root,
        });
        await writeFile(join(root, 'authority/source.json'), 'masked\n');
        assert.throws(
            () => assertOnlyAllowedGitChanges(root, head, []),
            /must not use skip-worktree or assume-unchanged/
        );
        assert.throws(
            () => assertCleanGitWorktree(root),
            /must not use skip-worktree or assume-unchanged/
        );
    });
}

test('ne laisse pas .git/info/exclude masquer un fichier non suivi', async (t) => {
    const { root, head } = await fixture(t);
    await writeFile(join(root, '.git/info/exclude'), 'injected.mjs\n');
    await writeFile(join(root, 'injected.mjs'), 'unsafe\n');
    assert.throws(
        () => assertOnlyAllowedGitChanges(root, head, []),
        /candidate changed protected paths: injected.mjs/
    );
    assert.throws(
        () => assertCleanGitWorktree(root),
        /requires a clean Git worktree and index/
    );
    assert.throws(
        () => assertAllowedPathsMatchGitCommit(root, head, ['injected.mjs']),
        /existed before the work order/
    );
});

test('ne laisse pas une exclusion globale masquer un fichier non suivi', async (t) => {
    const { root, head } = await fixture(t);
    await writeFile(join(root, 'global-ignore'), 'hidden.mjs\n');
    execFileSync('git', ['config', 'core.excludesFile', 'global-ignore'], {
        cwd: root,
    });
    await writeFile(join(root, 'hidden.mjs'), 'unsafe\n');
    assert.throws(
        () => assertCleanGitWorktree(root),
        /requires a clean Git worktree and index/
    );
    assert.throws(
        () => assertOnlyAllowedGitChanges(root, head, []),
        /candidate changed protected paths: global-ignore, hidden.mjs/
    );
});

test('lit le commit demandé malgré une replace ref et un environnement Git hostile', async (t) => {
    const { root, head } = await fixture(t);
    await writeFile(join(root, 'authority/source.json'), '{"safe":false}\n');
    execFileSync('git', ['add', '.'], { cwd: root });
    execFileSync('git', ['commit', '-qm', 'replacement'], { cwd: root });
    const replacement = execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: root,
        encoding: 'utf8',
    }).trim();
    execFileSync('git', ['replace', head, replacement], { cwd: root });
    const previousGitDir = process.env.GIT_DIR;
    process.env.GIT_DIR = join(root, 'missing-git-dir');
    try {
        const entry = createGitCommitReader(root, head)(
            'authority/source.json',
            'source'
        );
        assert.equal(entry.content.toString('utf8'), '{"safe":true}\n');
        const inventory = gitCommitInventory(root, head, []);
        assert.equal(
            inventory
                .find(({ path }) => path === 'authority/source.json')
                .content.toString('utf8'),
            '{"safe":true}\n'
        );
    } finally {
        if (previousGitDir === undefined) delete process.env.GIT_DIR;
        else process.env.GIT_DIR = previousGitDir;
    }
});

test('ignore les grafts locaux pour établir l’ascendance réelle des commits', async (t) => {
    const { root, head } = await fixture(t);
    const emptyTree = execFileSync('git', ['mktree'], {
        cwd: root,
        input: '',
        encoding: 'utf8',
    }).trim();
    const orphan = execFileSync(
        'git',
        ['commit-tree', emptyTree, '-m', 'orphan'],
        { cwd: root, encoding: 'utf8' }
    ).trim();
    const expectedError = /must be an ancestor of the candidate HEAD/;

    assert.throws(() => assertGitAncestor(root, head, orphan), expectedError);

    await writeFile(join(root, '.git/info/grafts'), `${orphan} ${head}\n`);
    assert.doesNotThrow(() =>
        execFileSync('git', ['merge-base', '--is-ancestor', head, orphan], {
            cwd: root,
            stdio: 'ignore',
        })
    );
    assert.throws(() => assertGitAncestor(root, head, orphan), expectedError);
});

test('accepte une chaîne réelle et chacun des deux parents d’un merge', async (t) => {
    const { root, head } = await fixture(t);
    await writeFile(join(root, 'first.txt'), 'first\n');
    execFileSync('git', ['add', 'first.txt'], { cwd: root });
    execFileSync('git', ['commit', '-qm', 'first'], { cwd: root });
    const first = execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: root,
        encoding: 'utf8',
    }).trim();
    assert.doesNotThrow(() => assertGitAncestor(root, head, first));

    execFileSync('git', ['checkout', '-q', '--detach', head], { cwd: root });
    await writeFile(join(root, 'second.txt'), 'second\n');
    execFileSync('git', ['add', 'second.txt'], { cwd: root });
    execFileSync('git', ['commit', '-qm', 'second'], { cwd: root });
    const second = execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: root,
        encoding: 'utf8',
    }).trim();
    execFileSync('git', ['merge', '-q', '--no-ff', first, '-m', 'merge'], {
        cwd: root,
    });
    const merge = execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: root,
        encoding: 'utf8',
    }).trim();

    assert.doesNotThrow(() => assertGitAncestor(root, first, merge));
    assert.doesNotThrow(() => assertGitAncestor(root, second, merge));
});

test('ignore une replace ref qui invente une ascendance', async (t) => {
    const { root, head } = await fixture(t);
    await writeFile(join(root, 'descendant.txt'), 'descendant\n');
    execFileSync('git', ['add', 'descendant.txt'], { cwd: root });
    execFileSync('git', ['commit', '-qm', 'descendant'], { cwd: root });
    const descendant = execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: root,
        encoding: 'utf8',
    }).trim();
    const emptyTree = execFileSync('git', ['mktree'], {
        cwd: root,
        input: '',
        encoding: 'utf8',
    }).trim();
    const orphan = execFileSync(
        'git',
        ['commit-tree', emptyTree, '-m', 'orphan'],
        { cwd: root, encoding: 'utf8' }
    ).trim();
    execFileSync('git', ['replace', orphan, descendant], { cwd: root });

    assert.doesNotThrow(() =>
        execFileSync('git', ['merge-base', '--is-ancestor', head, orphan], {
            cwd: root,
            stdio: 'ignore',
        })
    );
    assert.throws(
        () => assertGitAncestor(root, head, orphan),
        /must be an ancestor of the candidate HEAD/
    );
});

test('lit les parents bruts au-delà d’une frontière shallow locale', async (t) => {
    const { root, head } = await fixture(t);
    await writeFile(join(root, 'descendant.txt'), 'descendant\n');
    execFileSync('git', ['add', 'descendant.txt'], { cwd: root });
    execFileSync('git', ['commit', '-qm', 'descendant'], { cwd: root });
    const descendant = execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: root,
        encoding: 'utf8',
    }).trim();
    await writeFile(join(root, '.git/shallow'), `${descendant}\n`);

    assert.throws(() =>
        execFileSync('git', ['merge-base', '--is-ancestor', head, descendant], {
            cwd: root,
            stdio: 'ignore',
        })
    );
    assert.doesNotThrow(() => assertGitAncestor(root, head, descendant));
});

test('refuse un parent malformé et un objet parent manquant', async (t) => {
    const { root, head } = await fixture(t);
    const tree = execFileSync('git', ['rev-parse', `${head}^{tree}`], {
        cwd: root,
        encoding: 'utf8',
    }).trim();
    const author = 'CMZ test <cmz-test@example.invalid> 1700000000 +0000';
    const writeRawCommit = (parent) =>
        execFileSync(
            'git',
            ['hash-object', '-t', 'commit', '--stdin', '-w', '--literally'],
            {
                cwd: root,
                input: `tree ${tree}\nparent ${parent}\nauthor ${author}\ncommitter ${author}\n\nfixture\n`,
                encoding: 'utf8',
            }
        ).trim();

    const malformed = writeRawCommit('invalid');
    assert.throws(
        () => assertGitAncestor(root, head, malformed),
        /contains an invalid parent identity/
    );

    const missing = writeRawCommit('0000000000000000000000000000000000000000');
    assert.throws(
        () => assertGitAncestor(root, head, missing),
        /git cat-file failed/
    );
});

test('borne le parcours pur sans construire une histoire Git démesurée', () => {
    const ancestor = 'a'.repeat(40);
    const descendant = 'b'.repeat(40);
    const middle = 'c'.repeat(40);
    const last = 'd'.repeat(40);
    const commits = new Map([
        [descendant, `tree ${'1'.repeat(40)}\nparent ${middle}\n\nstart\n`],
        [middle, `tree ${'2'.repeat(40)}\nparent ${last}\n\nmiddle\n`],
        [last, `tree ${'3'.repeat(40)}\nparent ${ancestor}\n\nlast\n`],
    ]);
    assert.throws(
        () =>
            assertRawCommitAncestor(
                ancestor,
                descendant,
                (sha) => commits.get(sha),
                2
            ),
        /commit ancestry exceeds 2 raw objects/
    );
});

test('désactive explicitement replace refs et lazy-fetch sur chaque lecture Git', async (t) => {
    const { root, head } = await fixture(t);
    const bin = join(root, 'git-wrapper');
    const log = join(root, 'git-arguments.log');
    await mkdir(bin);
    const realGit = execFileSync('which', ['git'], {
        encoding: 'utf8',
    }).trim();
    const wrapper = join(bin, 'git');
    await writeFile(
        wrapper,
        `#!/bin/sh\nprintf '%s\\n' "$*" >> "${log}"\nexec "${realGit}" "$@"\n`
    );
    await chmod(wrapper, 0o755);
    const previousPath = process.env.PATH;
    process.env.PATH = `${bin}:${previousPath}`;
    try {
        createGitCommitReader(root, head)('authority/source.json', 'source');
        gitCommitInventory(root, head, []);
    } finally {
        process.env.PATH = previousPath;
    }
    const invocations = (await readFile(log, 'utf8')).trim().split('\n');
    assert.ok(invocations.length >= 5);
    for (const invocation of invocations) {
        assert.match(invocation, /--no-replace-objects/);
        assert.match(invocation, /--no-lazy-fetch/);
    }
});
