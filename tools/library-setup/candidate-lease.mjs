import { createHash, randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
    chmodSync,
    closeSync,
    constants,
    existsSync,
    fsyncSync,
    lstatSync,
    mkdirSync,
    openSync,
    readFileSync,
    readdirSync,
    realpathSync,
    renameSync,
    rmdirSync,
    unlinkSync,
    writeFileSync,
} from 'node:fs';
import { hostname, tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';

import {
    materializeGitTree,
    readGitTree,
    verifyMaterializedTree,
} from './git-tree.mjs';

const ID_PATTERN = /^[a-f0-9]{32}$/;
const LEASE_MODE = 0o700;
const CONTROL_MODE = 0o600;
const PRE_IDENTITY_GRACE_MS = 60_000;
const STATE_VALUES = new Set([
    'creating',
    'active',
    'orphaned',
    'releasing',
    'released',
]);

function fail(message) {
    throw new Error(`library candidate lease: ${message}`);
}

function sha256(content) {
    return createHash('sha256').update(content).digest('hex');
}

function document(value) {
    return `${JSON.stringify(value)}\n`;
}

function exactKeys(value, keys) {
    return (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        Object.keys(value).sort().join('\0') === [...keys].sort().join('\0')
    );
}

function modeOf(stats) {
    return stats.mode & 0o777;
}

function currentUid() {
    if (typeof process.getuid !== 'function')
        fail('UID indisponible sur cette plateforme');
    return process.getuid();
}

function syncDirectory(path) {
    const fd = openSync(path, constants.O_RDONLY);
    try {
        fsyncSync(fd);
    } finally {
        closeSync(fd);
    }
}

function writeExclusive(path, content, mode = CONTROL_MODE) {
    const fd = openSync(
        path,
        constants.O_CREAT |
            constants.O_EXCL |
            constants.O_WRONLY |
            (constants.O_NOFOLLOW ?? 0),
        mode
    );
    try {
        writeFileSync(fd, content);
        fsyncSync(fd);
    } finally {
        closeSync(fd);
    }
    chmodSync(path, mode);
}

function replaceState(leasePath, state) {
    const temporary = join(leasePath, 'state.tmp');
    if (existsSync(temporary))
        fail(`temporaire d'état déjà présent : ${temporary}`);
    writeExclusive(temporary, document(state));
    renameSync(temporary, join(leasePath, 'state.json'));
    syncDirectory(leasePath);
}

function parseJsonFile(path, label) {
    let value;
    try {
        value = JSON.parse(readFileSync(path, 'utf8'));
    } catch (error) {
        fail(`${label} illisible (${error.message})`);
    }
    return value;
}

function processStartedAt(pid) {
    try {
        return execFileSync('ps', ['-o', 'lstart=', '-p', String(pid)], {
            encoding: 'utf8',
            env: { PATH: process.env.PATH, LANG: 'C', LC_ALL: 'C' },
            stdio: ['ignore', 'pipe', 'ignore'],
        }).trim();
    } catch {
        return '';
    }
}

function assertRealDirectory(path, expectedMode, label) {
    const stats = lstatSync(path);
    if (stats.isSymbolicLink() || !stats.isDirectory()) {
        fail(`${label} n'est pas un vrai répertoire`);
    }
    if (stats.uid !== currentUid() || modeOf(stats) !== expectedMode) {
        fail(`${label} propriétaire ou permissions inattendus`);
    }
}

export function ensureLeaseRoot(
    requestedRoot = join(realpathSync(tmpdir()), 'cmz-library-candidates')
) {
    const parent = realpathSync(dirname(resolve(requestedRoot)));
    const root = join(parent, basename(requestedRoot));
    if (!existsSync(root)) {
        mkdirSync(root, { mode: LEASE_MODE });
        chmodSync(root, LEASE_MODE);
        syncDirectory(parent);
    }
    assertRealDirectory(root, LEASE_MODE, 'racine de bail');
    if (realpathSync(root) !== root) fail('racine de bail non canonique');
    return root;
}

function validateLeasePath(root, id) {
    if (!ID_PATTERN.test(id)) fail(`identifiant de bail invalide : ${id}`);
    const leasePath = join(root, id);
    const rel = relative(root, leasePath);
    if (rel !== id || rel.startsWith(`..${sep}`))
        fail('bail hors de sa racine');
    return leasePath;
}

function validateControlFile(path, label) {
    const stats = lstatSync(path);
    if (stats.isSymbolicLink() || !stats.isFile())
        fail(`${label} n'est pas un fichier régulier`);
    if (stats.uid !== currentUid() || modeOf(stats) !== CONTROL_MODE) {
        fail(`${label} propriétaire ou permissions inattendus`);
    }
}

function readIdentity(leasePath, id) {
    const markerPath = join(leasePath, 'marker');
    const statePath = join(leasePath, 'state.json');
    validateControlFile(markerPath, 'marqueur');
    validateControlFile(statePath, 'journal');
    const markerRaw = readFileSync(markerPath);
    const marker = parseJsonFile(markerPath, 'marqueur');
    const state = parseJsonFile(statePath, 'journal');
    if (
        !exactKeys(marker, [
            'schema_version',
            'id',
            'pid',
            'started_at',
            'hostname',
            'uid',
        ]) ||
        marker.schema_version !== '1.0.0' ||
        marker.id !== id ||
        !Number.isInteger(marker.pid) ||
        marker.pid <= 0 ||
        typeof marker.started_at !== 'string' ||
        marker.started_at.length === 0 ||
        typeof marker.hostname !== 'string' ||
        marker.hostname.length === 0 ||
        marker.uid !== currentUid()
    ) {
        fail('marqueur invalide');
    }
    if (
        !exactKeys(state, [
            'schema_version',
            'id',
            'state',
            'marker_sha256',
            'commit',
        ]) ||
        state.schema_version !== '1.0.0' ||
        state.id !== id ||
        !STATE_VALUES.has(state.state) ||
        state.marker_sha256 !== sha256(markerRaw) ||
        !/^[a-f0-9]{40,64}$/.test(state.commit ?? '')
    ) {
        fail('journal invalide ou discordant du marqueur');
    }
    return { marker, state, markerRaw };
}

function readReleasedStateOnly(leasePath, id) {
    const statePath = join(leasePath, 'state.json');
    validateControlFile(statePath, 'journal released');
    const state = parseJsonFile(statePath, 'journal released');
    if (
        !exactKeys(state, [
            'schema_version',
            'id',
            'state',
            'marker_sha256',
            'commit',
        ]) ||
        state.schema_version !== '1.0.0' ||
        state.id !== id ||
        state.state !== 'released' ||
        !/^[a-f0-9]{64}$/.test(state.marker_sha256 ?? '') ||
        !/^[a-f0-9]{40,64}$/.test(state.commit ?? '')
    ) {
        fail('journal released isolé invalide');
    }
    return state;
}

function assertPreIdentityLease(root, id, expectedEntry) {
    const leasePath = validateLeasePath(root, id);
    assertRealDirectory(leasePath, LEASE_MODE, 'bail pré-identité');
    if (realpathSync(dirname(leasePath)) !== root)
        fail('parent de bail non canonique');
    const entries = readdirSync(leasePath).sort();
    const expected = expectedEntry ? [expectedEntry] : [];
    if (JSON.stringify(entries) !== JSON.stringify(expected)) {
        fail(`inventaire pré-identité inattendu pour ${id}`);
    }
    if (expectedEntry)
        validateControlFile(join(leasePath, expectedEntry), expectedEntry);
    return leasePath;
}

function safeRemoveTree(path) {
    const stats = lstatSync(path);
    if (stats.isDirectory() && !stats.isSymbolicLink()) {
        for (const name of readdirSync(path)) safeRemoveTree(join(path, name));
        rmdirSync(path);
    } else {
        unlinkSync(path);
    }
}

function finishRelease(leasePath, identity) {
    const workspace = join(leasePath, 'workspace');
    const resources = join(leasePath, 'resources');
    if (identity.state.state !== 'released') {
        if (existsSync(workspace)) safeRemoveTree(workspace);
        if (existsSync(resources)) safeRemoveTree(resources);
        identity.state = { ...identity.state, state: 'released' };
        replaceState(leasePath, identity.state);
    } else if (existsSync(workspace)) {
        safeRemoveTree(workspace);
    }
    if (existsSync(resources)) safeRemoveTree(resources);
    unlinkSync(join(leasePath, 'marker'));
    unlinkSync(join(leasePath, 'state.json'));
    rmdirSync(leasePath);
}

function ownerStatus(marker, processProbe) {
    if (marker.hostname !== hostname()) return 'foreign';
    const observed = processProbe(marker.pid);
    if (observed === '') return 'dead';
    return observed === marker.started_at ? 'live' : 'pid-reused';
}

export function recoverCandidateLeases(
    requestedRoot,
    { processProbe = processStartedAt, now = Date.now } = {}
) {
    const root = ensureLeaseRoot(requestedRoot);
    const results = [];
    for (const id of readdirSync(root).sort()) {
        let leasePath;
        try {
            leasePath = validateLeasePath(root, id);
            assertRealDirectory(leasePath, LEASE_MODE, `bail ${id}`);
            const entries = readdirSync(leasePath).sort();
            const freshPreIdentity =
                now() - lstatSync(leasePath).mtimeMs < PRE_IDENTITY_GRACE_MS;
            if (entries.length === 0) {
                if (freshPreIdentity) {
                    results.push({
                        id,
                        action: 'kept',
                        reason: 'creation-grace',
                    });
                    continue;
                }
                assertPreIdentityLease(root, id);
                rmdirSync(leasePath);
                results.push({ id, action: 'purged-unclaimed' });
                continue;
            }
            if (JSON.stringify(entries) === JSON.stringify(['marker.tmp'])) {
                if (freshPreIdentity) {
                    results.push({
                        id,
                        action: 'kept',
                        reason: 'creation-grace',
                    });
                    continue;
                }
                assertPreIdentityLease(root, id, 'marker.tmp');
                unlinkSync(join(leasePath, 'marker.tmp'));
                rmdirSync(leasePath);
                results.push({ id, action: 'purged-unclaimed-temp' });
                continue;
            }
            if (JSON.stringify(entries) === JSON.stringify(['state.json'])) {
                readReleasedStateOnly(leasePath, id);
                unlinkSync(join(leasePath, 'state.json'));
                rmdirSync(leasePath);
                results.push({ id, action: 'purged-released' });
                continue;
            }
            if (
                !entries.includes('marker') ||
                !entries.includes('state.json')
            ) {
                const legalPartial = [
                    JSON.stringify(['marker']),
                    JSON.stringify(['marker', 'state.tmp']),
                ].includes(JSON.stringify(entries));
                if (freshPreIdentity && legalPartial) {
                    results.push({
                        id,
                        action: 'kept',
                        reason: 'creation-grace',
                    });
                    continue;
                }
                results.push({
                    id,
                    action: 'quarantined',
                    reason: 'identité incomplète',
                });
                continue;
            }
            const identity = readIdentity(leasePath, id);
            const { marker } = identity;
            if (identity.state.state === 'released') {
                finishRelease(leasePath, identity);
                results.push({ id, action: 'purged-released' });
                continue;
            }
            const owner = ownerStatus(marker, processProbe);
            if (owner === 'live' || owner === 'foreign') {
                results.push({ id, action: 'kept', reason: owner });
                continue;
            }
            if (owner === 'pid-reused') {
                results.push({ id, action: 'quarantined', reason: owner });
                continue;
            }
            if (identity.state.state !== 'releasing') {
                identity.state = { ...identity.state, state: 'orphaned' };
                replaceState(leasePath, identity.state);
                identity.state = { ...identity.state, state: 'releasing' };
                replaceState(leasePath, identity.state);
            }
            finishRelease(leasePath, identity);
            results.push({ id, action: 'purged-orphan' });
        } catch (error) {
            results.push({ id, action: 'quarantined', reason: error.message });
        }
    }
    syncDirectory(root);
    return results;
}

function beginLease(root, commit, processProbe) {
    const id = randomBytes(16).toString('hex');
    const leasePath = validateLeasePath(root, id);
    mkdirSync(leasePath, { mode: LEASE_MODE });
    chmodSync(leasePath, LEASE_MODE);
    syncDirectory(root);

    const marker = {
        schema_version: '1.0.0',
        id,
        pid: process.pid,
        started_at: processProbe(process.pid),
        hostname: hostname(),
        uid: currentUid(),
    };
    if (!marker.started_at)
        fail('instant de démarrage du processus introuvable');
    const markerRaw = document(marker);
    writeExclusive(join(leasePath, 'marker.tmp'), markerRaw);
    renameSync(join(leasePath, 'marker.tmp'), join(leasePath, 'marker'));
    syncDirectory(leasePath);

    const state = {
        schema_version: '1.0.0',
        id,
        state: 'creating',
        marker_sha256: sha256(markerRaw),
        commit,
    };
    replaceState(leasePath, state);
    const workspace = join(leasePath, 'workspace');
    mkdirSync(workspace, { mode: LEASE_MODE });
    chmodSync(workspace, LEASE_MODE);
    const resources = join(leasePath, 'resources');
    mkdirSync(resources, { mode: LEASE_MODE });
    chmodSync(resources, LEASE_MODE);
    const homes = {};
    for (const name of ['base', 'generation', 'verification', 'execution']) {
        const path = join(resources, `home-${name}`);
        mkdirSync(path, { mode: LEASE_MODE });
        chmodSync(path, LEASE_MODE);
        homes[name] = path;
    }
    syncDirectory(leasePath);
    return {
        id,
        root,
        path: leasePath,
        workspace,
        resources,
        homes,
        marker,
        state,
        processProbe,
    };
}

function updateLeaseState(lease, next) {
    const identity = readIdentity(lease.path, lease.id);
    if (
        identity.marker.pid !== process.pid ||
        identity.marker.started_at !== lease.processProbe(process.pid)
    ) {
        fail('le processus courant ne possède pas le bail');
    }
    const state = { ...identity.state, state: next };
    replaceState(lease.path, state);
    lease.state = state;
}

export function releaseCandidateLease(lease) {
    updateLeaseState(lease, 'releasing');
    const entries = readdirSync(lease.path).sort();
    if (
        JSON.stringify(entries) !==
        JSON.stringify(['marker', 'resources', 'state.json', 'workspace'])
    ) {
        fail('inventaire de contrôle inattendu avant libération');
    }
    const identity = readIdentity(lease.path, lease.id);
    finishRelease(lease.path, identity);
    syncDirectory(lease.root);
}

export function createCandidateLease({
    repository,
    commit = 'HEAD',
    leaseRoot,
    processProbe = processStartedAt,
}) {
    const tree = readGitTree(repository, commit);
    const root = ensureLeaseRoot(leaseRoot);
    recoverCandidateLeases(root, { processProbe });
    let lease;
    try {
        lease = beginLease(root, tree.commit, processProbe);
        materializeGitTree(tree, lease.workspace);
        verifyMaterializedTree(tree, lease.workspace);
        updateLeaseState(lease, 'active');
        return { ...lease, tree };
    } catch (error) {
        if (lease) {
            try {
                releaseCandidateLease(lease);
            } catch (cleanupError) {
                error.cleanupError = cleanupError;
            }
        } else {
            recoverCandidateLeases(root, { processProbe });
        }
        throw error;
    }
}
