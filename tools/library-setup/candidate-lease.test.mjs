import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
    chmod,
    mkdir,
    mkdtemp,
    readFile,
    readdir,
    rm,
    symlink,
    writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import {
    createCandidateLease,
    ensureLeaseRoot,
    recoverCandidateLeases,
    releaseCandidateLease,
} from './candidate-lease.mjs';

const START_TOKEN = 'Fri Sep  4 00:00:00 2026';
const processProbe = (pid) => (pid === process.pid ? START_TOKEN : '');

function git(root, ...args) {
    return execFileSync('git', ['-C', root, ...args], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
}

async function fixture(t) {
    const parent = await mkdtemp(join(tmpdir(), 'cmz-lease-test-'));
    t.after(() => rm(parent, { recursive: true, force: true }));
    const repo = join(parent, 'repo');
    const leaseRoot = join(parent, 'leases');
    await mkdir(repo, { mode: 0o700 });
    git(repo, 'init', '-q');
    git(repo, 'config', 'user.email', 'test@example.test');
    git(repo, 'config', 'user.name', 'Test');
    await writeFile(join(repo, 'package.json'), '{"name":"fixture"}\n');
    git(repo, 'add', '.');
    git(repo, 'commit', '-qm', 'fixture');
    return { parent, repo, leaseRoot };
}

test('crée un candidat actif exact puis le libère sans résidu', async (t) => {
    const { repo, leaseRoot } = await fixture(t);
    const lease = createCandidateLease({
        repository: repo,
        leaseRoot,
        processProbe,
    });
    assert.equal(
        JSON.parse(await readFile(join(lease.path, 'state.json'))).state,
        'active'
    );
    assert.equal(
        await readFile(join(lease.workspace, 'package.json'), 'utf8'),
        '{"name":"fixture"}\n'
    );
    releaseCandidateLease(lease);
    assert.deepEqual(await readdir(leaseRoot), []);
});

test('purge seulement un bail pré-identité vide ou réduit à marker.tmp', async (t) => {
    const { leaseRoot } = await fixture(t);
    ensureLeaseRoot(leaseRoot);
    const empty = 'a'.repeat(32);
    const temporary = 'b'.repeat(32);
    await mkdir(join(leaseRoot, empty), { mode: 0o700 });
    await chmod(join(leaseRoot, empty), 0o700);
    await mkdir(join(leaseRoot, temporary), { mode: 0o700 });
    await chmod(join(leaseRoot, temporary), 0o700);
    await writeFile(join(leaseRoot, temporary, 'marker.tmp'), 'partial', {
        mode: 0o600,
    });
    await chmod(join(leaseRoot, temporary, 'marker.tmp'), 0o600);
    const result = recoverCandidateLeases(leaseRoot, {
        now: () => Date.now() + 61_000,
    });
    assert.deepEqual(result.map(({ action }) => action).sort(), [
        'purged-unclaimed',
        'purged-unclaimed-temp',
    ]);
    assert.deepEqual(await readdir(leaseRoot), []);
});

test('une récupération concurrente ne supprime jamais une création fraîche', async (t) => {
    const { leaseRoot } = await fixture(t);
    ensureLeaseRoot(leaseRoot);
    const empty = 'd'.repeat(32);
    const temporary = 'e'.repeat(32);
    await mkdir(join(leaseRoot, empty), { mode: 0o700 });
    await mkdir(join(leaseRoot, temporary), { mode: 0o700 });
    await writeFile(join(leaseRoot, temporary, 'marker.tmp'), 'partial', {
        mode: 0o600,
    });
    const result = recoverCandidateLeases(leaseRoot);
    assert.deepEqual(
        result.map(({ action, reason }) => ({ action, reason })),
        [
            { action: 'kept', reason: 'creation-grace' },
            { action: 'kept', reason: 'creation-grace' },
        ]
    );
    assert.deepEqual((await readdir(leaseRoot)).sort(), [empty, temporary]);
});

test('quarantaine un état pré-identité avec un octet inattendu', async (t) => {
    const { leaseRoot } = await fixture(t);
    ensureLeaseRoot(leaseRoot);
    const id = 'c'.repeat(32);
    await mkdir(join(leaseRoot, id), { mode: 0o700 });
    await writeFile(join(leaseRoot, id, 'unknown'), 'do not delete');
    const [result] = recoverCandidateLeases(leaseRoot);
    assert.equal(result.action, 'quarantined');
    assert.equal(
        await readFile(join(leaseRoot, id, 'unknown'), 'utf8'),
        'do not delete'
    );
});

test('un bail vivant est conservé et une discordance est mise en quarantaine', async (t) => {
    const { repo, leaseRoot } = await fixture(t);
    const lease = createCandidateLease({
        repository: repo,
        leaseRoot,
        processProbe,
    });
    assert.equal(
        recoverCandidateLeases(leaseRoot, { processProbe })[0].action,
        'kept'
    );
    const statePath = join(lease.path, 'state.json');
    const state = JSON.parse(await readFile(statePath));
    state.marker_sha256 = '0'.repeat(64);
    await writeFile(statePath, `${JSON.stringify(state)}\n`, { mode: 0o600 });
    await chmod(statePath, 0o600);
    assert.equal(
        recoverCandidateLeases(leaseRoot, { processProbe })[0].action,
        'quarantined'
    );
});

test('un PID réutilisé est quarantiné, jamais purgé', async (t) => {
    const { repo, leaseRoot } = await fixture(t);
    const lease = createCandidateLease({
        repository: repo,
        leaseRoot,
        processProbe,
    });
    const markerPath = join(lease.path, 'marker');
    const statePath = join(lease.path, 'state.json');
    const marker = JSON.parse(await readFile(markerPath));
    marker.started_at = 'Mon Jan  1 00:00:00 1900';
    const markerRaw = `${JSON.stringify(marker)}\n`;
    const state = JSON.parse(await readFile(statePath));
    state.marker_sha256 = createHash('sha256').update(markerRaw).digest('hex');
    await writeFile(markerPath, markerRaw, { mode: 0o600 });
    await chmod(markerPath, 0o600);
    await writeFile(statePath, `${JSON.stringify(state)}\n`, { mode: 0o600 });
    await chmod(statePath, 0o600);
    const [result] = recoverCandidateLeases(leaseRoot, { processProbe });
    assert.deepEqual(
        { action: result.action, reason: result.reason },
        { action: 'quarantined', reason: 'pid-reused' }
    );
    assert.ok((await readdir(leaseRoot)).includes(lease.id));
});

test('reprend un orphan en journalisant sa libération puis ne laisse aucun résidu', async (t) => {
    const { repo, leaseRoot } = await fixture(t);
    const lease = createCandidateLease({
        repository: repo,
        leaseRoot,
        processProbe,
    });
    const markerPath = join(lease.path, 'marker');
    const statePath = join(lease.path, 'state.json');
    const marker = JSON.parse(await readFile(markerPath));
    marker.pid = 99999999;
    const markerRaw = `${JSON.stringify(marker)}\n`;
    const state = JSON.parse(await readFile(statePath));
    state.marker_sha256 = createHash('sha256').update(markerRaw).digest('hex');
    await writeFile(markerPath, markerRaw, { mode: 0o600 });
    await chmod(markerPath, 0o600);
    await writeFile(statePath, `${JSON.stringify(state)}\n`, { mode: 0o600 });
    await chmod(statePath, 0o600);
    const [result] = recoverCandidateLeases(leaseRoot, { processProbe });
    assert.equal(result.action, 'purged-orphan');
    assert.deepEqual(await readdir(leaseRoot), []);
});

test('reprend la dernière frontière de libération avec state.json released seul', async (t) => {
    const { repo, leaseRoot } = await fixture(t);
    const lease = createCandidateLease({
        repository: repo,
        leaseRoot,
        processProbe,
    });
    const markerPath = join(lease.path, 'marker');
    const statePath = join(lease.path, 'state.json');
    const state = JSON.parse(await readFile(statePath));
    state.state = 'released';
    await rm(lease.workspace, { recursive: true });
    await rm(lease.resources, { recursive: true });
    await rm(markerPath);
    await writeFile(statePath, `${JSON.stringify(state)}\n`, { mode: 0o600 });
    await chmod(statePath, 0o600);
    const [result] = recoverCandidateLeases(leaseRoot, { processProbe });
    assert.equal(result.action, 'purged-released');
    assert.deepEqual(await readdir(leaseRoot), []);
});

test('refuse une racine de bail fournie par lien symbolique', async (t) => {
    const { parent } = await fixture(t);
    const target = join(parent, 'target');
    const link = join(parent, 'link');
    await mkdir(target, { mode: 0o700 });
    await symlink(target, link);
    assert.throws(() => ensureLeaseRoot(link), /vrai répertoire|canonique/);
});
