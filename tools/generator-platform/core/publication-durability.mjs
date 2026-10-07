import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, statfs } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import {
    commitDirectoryTransaction,
    syncTreeDirectories,
    writeDocument,
} from './generation-transaction.mjs';

const contractUrl = new URL(
    '../contracts/publication-durability.contract.json',
    import.meta.url
);
const execFileAsync = promisify(execFile);

const ACCEPTED_FILESYSTEM_PROFILES = Object.freeze([
    {
        id: 'linux-ext4',
        platform: 'linux',
        detector: { kind: 'statfs-type', value: 0xef53 },
        ci_runner: 'ubuntu-24.04',
    },
    {
        id: 'macos-apfs',
        platform: 'darwin',
        detector: {
            kind: 'darwin-mount',
            filesystem: 'apfs',
            required_options: ['local'],
        },
        ci_runner: 'macos-14',
    },
]);

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
        contract.schema_version !== '2.0.0' ||
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
    for (const profile of contract.filesystem_profiles) {
        if (
            !hasExactKeys(profile, [
                'id',
                'platform',
                'detector',
                'ci_runner',
            ]) ||
            typeof profile.id !== 'string' ||
            !['linux', 'darwin'].includes(profile.platform) ||
            typeof profile.ci_runner !== 'string' ||
            profile.ci_runner.length === 0
        ) {
            fail('invalid filesystem profile');
        }
        if (profile.detector?.kind === 'statfs-type') {
            if (
                !hasExactKeys(profile.detector, ['kind', 'value']) ||
                !Number.isInteger(profile.detector.value) ||
                profile.detector.value < 0
            ) {
                fail('invalid statfs filesystem detector');
            }
            continue;
        }
        if (profile.detector?.kind === 'darwin-mount') {
            if (
                !hasExactKeys(profile.detector, [
                    'kind',
                    'filesystem',
                    'required_options',
                ]) ||
                typeof profile.detector.filesystem !== 'string' ||
                profile.detector.filesystem.length === 0
            ) {
                fail('invalid Darwin mount detector');
            }
            assertStringList(
                profile.detector.required_options,
                'Darwin mount required_options'
            );
            continue;
        }
        fail('unknown filesystem detector');
    }
    if (
        JSON.stringify(contract.filesystem_profiles) !==
        JSON.stringify(ACCEPTED_FILESYSTEM_PROFILES)
    ) {
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

function assertCommandOutput(stdout, label) {
    if (typeof stdout !== 'string' || stdout.includes('\0')) {
        fail(`${label} returned invalid output`);
    }
    return stdout;
}

export function parseDarwinDf(stdout) {
    const lines = assertCommandOutput(stdout, 'df')
        .split(/\r?\n/u)
        .filter((line) => line.trim().length > 0);
    if (lines.length !== 2 || !lines[0].startsWith('Filesystem ')) {
        fail('df returned an unexpected mount table');
    }
    const match = lines[1].match(/^(\S+)\s+\d+\s+\d+\s+\d+\s+\d+%\s+(\/.*)$/u);
    if (!match) fail('df returned an invalid filesystem record');
    return { source: match[1], mount_point: match[2] };
}

export function parseDarwinMount(stdout, expected) {
    if (
        !isPlainRecord(expected) ||
        typeof expected.source !== 'string' ||
        typeof expected.mount_point !== 'string'
    ) {
        fail('invalid expected Darwin mount');
    }
    const prefix = `${expected.source} on ${expected.mount_point} (`;
    const matches = assertCommandOutput(stdout, 'mount')
        .split(/\r?\n/u)
        .filter((line) => line.startsWith(prefix) && line.endsWith(')'));
    if (matches.length !== 1) {
        fail(
            `mount record is ${matches.length === 0 ? 'missing' : 'ambiguous'} for ${expected.mount_point}`
        );
    }
    const fields = matches[0]
        .slice(prefix.length, -1)
        .split(',')
        .map((field) => field.trim());
    if (
        fields.length === 0 ||
        fields.some((field) => !/^[a-z0-9][a-z0-9 _-]*$/u.test(field))
    ) {
        fail('mount returned invalid filesystem metadata');
    }
    return {
        filesystem: fields[0],
        mount_options: fields.slice(1),
    };
}

async function runFilesystemCommand(command, args) {
    try {
        const result = await execFileAsync(command, args, {
            encoding: 'utf8',
            env: { ...process.env, LANG: 'C', LC_ALL: 'C' },
            maxBuffer: 1024 * 1024,
            timeout: 10_000,
        });
        return result.stdout;
    } catch (error) {
        fail(`${command} failed (${error.message})`);
    }
}

export async function detectPublicationFilesystem(
    root = tmpdir(),
    {
        platform = process.platform,
        statfsProvider = statfs,
        commandRunner = runFilesystemCommand,
    } = {}
) {
    const statistics = await statfsProvider(root);
    const detected = {
        platform,
        statfs_type: Number(statistics.type),
        block_size: Number(statistics.bsize),
    };
    if (platform !== 'darwin') return detected;

    const df = parseDarwinDf(await commandRunner('/bin/df', ['-P', root]));
    const mount = parseDarwinMount(await commandRunner('/sbin/mount', []), df);
    return {
        ...detected,
        ...df,
        ...mount,
    };
}

export function selectPublicationFilesystemProfile(contract, detected) {
    const profile = contract.filesystem_profiles.find((candidate) => {
        if (candidate.platform !== detected.platform) return false;
        if (candidate.detector.kind === 'statfs-type') {
            return candidate.detector.value === detected.statfs_type;
        }
        return (
            candidate.detector.filesystem === detected.filesystem &&
            candidate.detector.required_options.every((option) =>
                detected.mount_options?.includes(option)
            )
        );
    });
    if (!profile) {
        const signature = detected.filesystem
            ? `${detected.filesystem}[${detected.mount_options?.join(',') ?? ''}]`
            : String(detected.statfs_type);
        fail(`unsupported filesystem ${detected.platform}:${signature}`);
    }
    return profile;
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
    expectedPlatform,
} = {}) {
    const contract = await loadPublicationDurabilityContract();
    const detected = await detectPublicationFilesystem(root);
    const profile = selectPublicationFilesystemProfile(contract, detected);
    if (expectedProfileId && profile.id !== expectedProfileId) {
        fail(`expected profile ${expectedProfileId}, detected ${profile.id}`);
    }
    if (expectedPlatform && profile.platform !== expectedPlatform) {
        fail(
            `expected platform ${expectedPlatform}, detected ${profile.platform}`
        );
    }
    return { profile, detected };
}

export async function assertSupportedPublicationEnvironment(options = {}) {
    const result = await assertSupportedPublicationFilesystem(options);
    await probePublicationFilesystem(options.root ?? tmpdir());
    return result;
}
