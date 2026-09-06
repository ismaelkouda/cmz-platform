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
import { test } from 'node:test';

import {
    gitBlobOid,
    materializeGitTree,
    readGitTree,
    validateTreeEntries,
    verifyMaterializedTree,
} from './git-tree.mjs';

function git(root, ...args) {
    return execFileSync('git', ['-C', root, ...args], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
}

async function repository(t) {
    const root = await mkdtemp(join(tmpdir(), 'cmz-git-tree-repo-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    git(root, 'init', '-q');
    git(root, 'config', 'user.email', 'test@example.test');
    git(root, 'config', 'user.name', 'Test');
    await mkdir(join(root, 'src'));
    await writeFile(join(root, 'README.md'), 'vrai\n');
    await writeFile(join(root, 'src/run.sh'), '#!/bin/sh\nexit 0\n');
    await chmod(join(root, 'src/run.sh'), 0o755);
    await symlink('../README.md', join(root, 'src/readme-link'));
    git(root, 'add', '.');
    git(root, 'commit', '-qm', 'fixture');
    return root;
}

test('matérialise et revérifie exactement fichiers, modes et liens du tree', async (t) => {
    const repo = await repository(t);
    const destination = await mkdtemp(join(tmpdir(), 'cmz-git-tree-out-'));
    t.after(() => rm(destination, { recursive: true, force: true }));
    const tree = readGitTree(repo);
    materializeGitTree(tree, destination);
    assert.equal(
        await readFile(join(destination, 'README.md'), 'utf8'),
        'vrai\n'
    );
    assert.equal(verifyMaterializedTree(tree, destination), true);
});

test('refs/replace ne peut pas substituer les octets lus', async (t) => {
    const repo = await repository(t);
    const original = git(repo, 'rev-parse', 'HEAD:README.md');
    const replacement = execFileSync(
        'git',
        ['-C', repo, 'hash-object', '-w', '--stdin'],
        {
            input: 'faux\n',
            encoding: 'utf8',
        }
    ).trim();
    git(repo, 'replace', original, replacement);
    assert.equal(git(repo, 'cat-file', '-p', original), 'faux');
    const tree = readGitTree(repo);
    assert.equal(
        tree.entries
            .find(({ path }) => path === 'README.md')
            .content.toString(),
        'vrai\n'
    );
});

test('refuse liens sortants, modes spéciaux et collisions de chemins', () => {
    const oid = 'a'.repeat(40);
    assert.throws(
        () =>
            validateTreeEntries([
                {
                    mode: '160000',
                    type: 'commit',
                    oid,
                    path: Buffer.from('sub'),
                },
            ]),
        /mode ou type Git interdit/
    );
    assert.throws(
        () =>
            validateTreeEntries([
                { mode: '100644', type: 'blob', oid, path: Buffer.from('A') },
                { mode: '100644', type: 'blob', oid, path: Buffer.from('a') },
            ]),
        /collision insensible/
    );
    assert.throws(
        () =>
            validateTreeEntries([
                {
                    mode: '100644',
                    type: 'blob',
                    oid,
                    path: Buffer.from('.GiT/config'),
                },
            ]),
        /segment .git interdit/
    );
    assert.throws(
        () =>
            validateTreeEntries([
                {
                    mode: '100644',
                    type: 'blob',
                    oid,
                    path: Buffer.from([0xff]),
                },
            ]),
        /non UTF-8/
    );
});

test('refuse un tree dont un fichier est aussi ancêtre', () => {
    const oid = 'b'.repeat(40);
    assert.throws(
        () =>
            validateTreeEntries([
                { mode: '120000', type: 'blob', oid, path: Buffer.from('x') },
                {
                    mode: '100644',
                    type: 'blob',
                    oid,
                    path: Buffer.from('x/evil'),
                },
            ]),
        /conflit fichier\/répertoire/
    );
});

test('refuse une cible de lien absolue avant toute écriture', async (t) => {
    const repo = await repository(t);
    await rm(join(repo, 'src/readme-link'));
    await symlink('/tmp/escape', join(repo, 'src/readme-link'));
    git(repo, 'add', '-A');
    git(repo, 'commit', '-qm', 'unsafe link');
    assert.throws(() => readGitTree(repo), /cible de lien absolue/);
});

test('refuse une cible de lien relative qui remonte hors du candidat', async (t) => {
    const repo = await repository(t);
    await rm(join(repo, 'src/readme-link'));
    await symlink('../../../outside', join(repo, 'src/readme-link'));
    git(repo, 'add', '-A');
    git(repo, 'commit', '-qm', 'relative escape');
    assert.throws(() => readGitTree(repo), /lien hors candidat/);
});

test('une dérive de contenu, de mode ou un fichier inattendu invalide le candidat', async (t) => {
    const repo = await repository(t);
    const destination = await mkdtemp(join(tmpdir(), 'cmz-git-tree-drift-'));
    t.after(() => rm(destination, { recursive: true, force: true }));
    const tree = readGitTree(repo);
    materializeGitTree(tree, destination);
    await writeFile(join(destination, 'README.md'), 'altéré\n');
    assert.throws(
        () => verifyMaterializedTree(tree, destination),
        /OID différent/
    );
});

test('calcule l’OID Git avec en-tête et algorithme explicites', () => {
    assert.equal(
        gitBlobOid('abc', 'sha1'),
        'f2ba8f84ab5c1bce84a7b441cb1959cfc7093b7f'
    );
});
