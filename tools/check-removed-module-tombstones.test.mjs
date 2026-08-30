import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
    copyFile,
    mkdir,
    mkdtemp,
    readFile,
    rm,
    writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const MODULE = 'obsolete-feature';

async function write(path, content) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content);
}

function run(root, script, args = []) {
    return spawnSync(process.execPath, [join(root, 'tools', script), ...args], {
        cwd: root,
        encoding: 'utf8',
    });
}

async function createWorkspace(t) {
    const root = await mkdtemp(join(tmpdir(), 'cmz-tombstone-registry-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    await mkdir(join(root, 'tools'), { recursive: true });
    for (const script of [
        'check-no-orphan-references.mjs',
        'check-removed-module-tombstones.mjs',
        'orphan-occurrence.mjs',
        'orphan-tombstone-update.mjs',
    ]) {
        await copyFile(
            join(REPO_ROOT, 'tools', script),
            join(root, 'tools', script)
        );
    }
    assert.equal(
        spawnSync('git', ['init', '--quiet'], { cwd: root }).status,
        0
    );
    await write(join(root, '.gitignore'), '/.cmz/\n');
    await write(join(root, 'active.txt'), `${MODULE}\n`);
    assert.equal(
        spawnSync('git', ['add', '.'], { cwd: root, encoding: 'utf8' }).status,
        0
    );
    return root;
}

test('élague automatiquement une occurrence exacte devenue périmée', async (t) => {
    const root = await createWorkspace(t);
    const scan = run(root, 'check-no-orphan-references.mjs', [
        '--module',
        MODULE,
    ]);
    assert.equal(scan.status, 1);
    const occurrence = scan.stderr.match(
        /occurrence-sha256: ([a-f0-9]{64})/
    )?.[1];
    assert.ok(occurrence, scan.stderr);

    const tombstone = `docs/architecture/removed-modules/${MODULE}.json`;
    const created = run(root, 'check-no-orphan-references.mjs', [
        '--module',
        MODULE,
        '--create-tombstone',
        tombstone,
        '--active-reference',
        `active.txt::${occurrence}::fixture active revue`,
    ]);
    assert.equal(created.status, 0, created.stderr || created.stdout);

    await rm(join(root, 'active.txt'));
    const stale = run(root, 'check-removed-module-tombstones.mjs');
    assert.equal(stale.status, 1);
    assert.match(stale.stderr, /tombstone\(s\) périmé\(s\)/);

    const pruned = run(root, 'check-removed-module-tombstones.mjs', [
        '--prune-stale',
    ]);
    assert.equal(pruned.status, 0, pruned.stderr || pruned.stdout);
    assert.match(pruned.stdout, /réconcilié\(s\) puis validé\(s\)/);
    const document = JSON.parse(await readFile(join(root, tombstone), 'utf8'));
    assert.deepEqual(document.references, []);

    const verified = run(root, 'check-removed-module-tombstones.mjs');
    assert.equal(verified.status, 0, verified.stderr || verified.stdout);
});

test('refuse les arguments ambigus ou inconnus', async (t) => {
    const root = await createWorkspace(t);
    for (const args of [
        ['--prune-stale', '--prune-stale'],
        ['--allow-stale'],
    ]) {
        const result = run(root, 'check-removed-module-tombstones.mjs', args);
        assert.equal(result.status, 1);
        assert.match(result.stderr, /Argument inconnu/);
    }
});
