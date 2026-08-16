import { mkdtemp, mkdir, readFile, rm, statfs } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    commitDirectoryTransaction,
    syncTreeDirectories,
    writeDocument,
} from './generation-transaction.mjs';

const contractUrl = new URL(
    '../contracts/publication-durability.contract.json',
    import.meta.url
);

function fail(message) {
    throw new Error(`publication durability: ${message}`);
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

function assertStringList(value, label) {
    if (
        !Array.isArray(value) ||
        value.length === 0 ||
        value.some(
            (entry) => typeof entry !== 'string' || entry.length === 0
        ) ||
        new Set(value).size !== value.length
    ) {
        fail(`${label} must be a non-empty unique string list`);
    }
}

function assertExactStringList(value, expected, label) {
    assertStringList(value, label);
    if (value.join('\0') !== expected.join('\0')) {
        fail(`${label} does not match the accepted contract`);
    }
}

export function validatePublicationDurabilityContract(contract) {
    if (
        !hasExactKeys(contract, [
            'schema_version',
            'capability_id',
            'reader_contract',
            'storage_contract',
            'failure_model',
            'filesystem_profiles',
            'required_evidence',
        ]) ||
        contract.schema_version !== '1.0.0' ||
        contract.capability_id !== 'generation.publication-durability'
    ) {
        fail('invalid root contract');
    }
    if (
        !hasExactKeys(contract.reader_contract, [
            'mode',
            'activation_boundary',
            'concurrent_non_cooperating_readers',
            'enforcement',
        ]) ||
        contract.reader_contract.mode !== 'offline-activation' ||
        contract.reader_contract.activation_boundary !==
            'publication-command-success' ||
        contract.reader_contract.concurrent_non_cooperating_readers !==
            'unsupported' ||
        contract.reader_contract.enforcement !==
            'calling-orchestrator-precondition'
    ) {
        fail('invalid reader contract');
    }
    if (
        !hasExactKeys(contract.storage_contract, [
            'layout',
            'required_primitives',
            'unsupported',
        ]) ||
        contract.storage_contract.layout !== 'same-local-filesystem'
    ) {
        fail('invalid storage contract');
    }
    assertExactStringList(
        contract.storage_contract.required_primitives,
        ['atomic-directory-rename', 'file-fsync', 'directory-fsync'],
        'storage required_primitives'
    );
    assertExactStringList(
        contract.storage_contract.unsupported,
        [
            'network-filesystem',
            'cross-filesystem-publication',
            'symbolic-link-output',
            'special-file-output',
        ],
        'storage unsupported'
    );
    if (!hasExactKeys(contract.failure_model, ['covered', 'excluded'])) {
        fail('invalid failure model');
    }
    assertExactStringList(
        contract.failure_model.covered,
        [
            'writer-process-sigkill',
            'host-stop-after-successful-fsync',
            'interrupted-cleanup',
        ],
        'failure covered'
    );
    assertExactStringList(
        contract.failure_model.excluded,
        [
            'storage-media-loss',
            'filesystem-contract-violation',
            'concurrent-external-output-mutation',
        ],
        'failure excluded'
    );
    assertExactStringList(
        contract.required_evidence,
        [
            'environment-profile-match',
            'real-filesystem-publication-probe',
            'sigkill-after-previous-move',
            'sigkill-after-candidate-publish',
            'journal-and-artifact-hash-verification',
            'ci-matrix-green',
        ],
        'required_evidence'
    );
    if (
        !Array.isArray(contract.filesystem_profiles) ||
        contract.filesystem_profiles.length === 0
    ) {
        fail('filesystem_profiles must not be empty');
    }
    const ids = new Set();
    const signatures = new Set();
    for (const profile of contract.filesystem_profiles) {
        if (
            !hasExactKeys(profile, [
                'id',
                'platform',
                'statfs_type',
                'ci_runner',
            ]) ||
            typeof profile.id !== 'string' ||
            !['linux', 'darwin'].includes(profile.platform) ||
            !Number.isInteger(profile.statfs_type) ||
            profile.statfs_type < 0 ||
            typeof profile.ci_runner !== 'string' ||
            profile.ci_runner.length === 0 ||
            ids.has(profile.id) ||
            signatures.has(`${profile.platform}:${profile.statfs_type}`)
        ) {
            fail('invalid or duplicate filesystem profile');
        }
        ids.add(profile.id);
        signatures.add(`${profile.platform}:${profile.statfs_type}`);
    }
    if ([...ids].join('\0') !== ['linux-ext4', 'macos-apfs'].join('\0')) {
        fail('filesystem profiles do not match the accepted contract');
    }
    return contract;
}

export async function loadPublicationDurabilityContract() {
    const contract = JSON.parse(
        await readFile(fileURLToPath(contractUrl), 'utf8')
    );
    return validatePublicationDurabilityContract(contract);
}

export async function detectPublicationFilesystem(root = tmpdir()) {
    const statistics = await statfs(root);
    return {
        platform: process.platform,
        statfs_type: Number(statistics.type),
        block_size: Number(statistics.bsize),
    };
}

export async function probePublicationFilesystem(root = tmpdir()) {
    const probeRoot = await mkdtemp(resolve(root, '.cmz-publication-probe-'));
    const outputRoot = resolve(probeRoot, 'output');
    const transactionRoot = resolve(probeRoot, 'transaction');
    const candidateRoot = resolve(transactionRoot, 'candidate');
    try {
        await mkdir(outputRoot);
        await mkdir(transactionRoot);
        await mkdir(candidateRoot);
        await writeDocument(resolve(outputRoot, 'version.txt'), 'previous\n');
        await writeDocument(
            resolve(candidateRoot, 'version.txt'),
            'candidate\n'
        );
        await syncTreeDirectories(outputRoot);
        await syncTreeDirectories(candidateRoot);
        const result = await commitDirectoryTransaction({
            outputRoot,
            candidateRoot,
            expectedState: 'present',
        });
        if (
            result.cleanup_pending ||
            (await readFile(resolve(outputRoot, 'version.txt'), 'utf8')) !==
                'candidate\n'
        ) {
            fail(
                'real filesystem publication probe produced an invalid result'
            );
        }
    } finally {
        await rm(probeRoot, { recursive: true, force: true });
    }
}

export async function assertSupportedPublicationFilesystem({
    root = tmpdir(),
    expectedProfileId,
} = {}) {
    const contract = await loadPublicationDurabilityContract();
    const detected = await detectPublicationFilesystem(root);
    const profile = contract.filesystem_profiles.find(
        (candidate) =>
            candidate.platform === detected.platform &&
            candidate.statfs_type === detected.statfs_type
    );
    if (!profile) {
        fail(
            `unsupported filesystem ${detected.platform}:${detected.statfs_type}`
        );
    }
    if (expectedProfileId && profile.id !== expectedProfileId) {
        fail(`expected profile ${expectedProfileId}, detected ${profile.id}`);
    }
    return { profile, detected };
}

export async function assertSupportedPublicationEnvironment(options = {}) {
    const result = await assertSupportedPublicationFilesystem(options);
    await probePublicationFilesystem(options.root ?? tmpdir());
    return result;
}
