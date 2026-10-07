import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import test from 'node:test';

import {
    assertSupportedPublicationEnvironment,
    detectPublicationFilesystem,
    loadPublicationDurabilityContract,
    parseDarwinDf,
    parseDarwinMount,
    selectPublicationFilesystemProfile,
    validatePublicationDurabilityContract,
} from './core/publication-durability.mjs';

const APFS_DF = `Filesystem   512-blocks      Used Available Capacity  Mounted on
/dev/disk3s5  965595304 866365944   2800248   100%    /System/Volumes/Data
`;
const APFS_MOUNT = `/dev/disk3s1s1 on / (apfs, sealed, local, read-only, journaled)
/dev/disk3s5 on /System/Volumes/Data (apfs, local, journaled, nobrowse)
`;

test('publication durability contract is closed, unique, and fail-closed', async () => {
    const contract = await loadPublicationDurabilityContract();
    assert.deepEqual(
        contract.filesystem_profiles.map(({ id }) => id),
        ['linux-ext4', 'macos-apfs']
    );
    assert.equal(contract.reader_contract.mode, 'offline-activation');
    assert.equal(
        contract.reader_contract.concurrent_non_cooperating_readers,
        'unsupported'
    );

    const invalid = structuredClone(contract);
    invalid.reader_contract.undeclared = true;
    assert.throws(
        () => validatePublicationDurabilityContract(invalid),
        /invalid reader contract/
    );

    const weakened = structuredClone(contract);
    weakened.required_evidence.pop();
    assert.throws(
        () => validatePublicationDurabilityContract(weakened),
        /required_evidence does not match/
    );
});

test('Darwin APFS resolves by semantic mount identity, independently of its numeric enum', async () => {
    const contract = await loadPublicationDurabilityContract();
    assert.deepEqual(
        [24, 25, 26, 27, 28, 29].map(
            (statfs_type) =>
                selectPublicationFilesystemProfile(contract, {
                    platform: 'darwin',
                    statfs_type,
                    filesystem: 'apfs',
                    mount_options: ['local', 'journaled'],
                }).id
        ),
        Array.from({ length: 6 }, () => 'macos-apfs')
    );
    for (const filesystem of ['nfs', 'smbfs']) {
        assert.throws(
            () =>
                selectPublicationFilesystemProfile(contract, {
                    platform: 'darwin',
                    statfs_type: 26,
                    filesystem,
                    mount_options: [],
                }),
            new RegExp(`unsupported filesystem darwin:${filesystem}`)
        );
    }
    assert.throws(
        () =>
            selectPublicationFilesystemProfile(contract, {
                platform: 'darwin',
                statfs_type: 26,
                filesystem: 'apfs',
                mount_options: ['journaled'],
            }),
        /unsupported filesystem darwin:apfs/
    );
});

test('Darwin mount parsers bind df source and mount point to one local APFS record', () => {
    const df = parseDarwinDf(APFS_DF);
    assert.deepEqual(df, {
        source: '/dev/disk3s5',
        mount_point: '/System/Volumes/Data',
    });
    assert.deepEqual(parseDarwinMount(APFS_MOUNT, df), {
        filesystem: 'apfs',
        mount_options: ['local', 'journaled', 'nobrowse'],
    });
});

test('Darwin detection executes fixed commands without a shell and keeps statfs diagnostic-only', async () => {
    const commands = [];
    const detected = await detectPublicationFilesystem('/private/tmp', {
        platform: 'darwin',
        statfsProvider: async () => ({ type: 24, bsize: 4096 }),
        commandRunner: async (command, args) => {
            commands.push([command, args]);
            if (command === '/bin/df') return APFS_DF;
            if (command === '/sbin/mount') return APFS_MOUNT;
            throw new Error(`unexpected command ${command}`);
        },
    });
    assert.deepEqual(commands, [
        ['/bin/df', ['-P', '/private/tmp']],
        ['/sbin/mount', []],
    ]);
    assert.deepEqual(detected, {
        platform: 'darwin',
        statfs_type: 24,
        block_size: 4096,
        source: '/dev/disk3s5',
        mount_point: '/System/Volumes/Data',
        filesystem: 'apfs',
        mount_options: ['local', 'journaled', 'nobrowse'],
    });
});

test('Darwin detection fails closed on malformed, missing, or ambiguous mount evidence', () => {
    assert.throws(
        () => parseDarwinDf('unexpected\n'),
        /unexpected mount table/
    );
    const df = parseDarwinDf(APFS_DF);
    assert.throws(
        () => parseDarwinMount('/dev/disk9 on /other (apfs, local)\n', df),
        /mount record is missing/
    );
    assert.throws(
        () =>
            parseDarwinMount(`${APFS_MOUNT}${APFS_MOUNT.split('\n')[1]}\n`, df),
        /mount record is ambiguous/
    );
});

test('Darwin detection fails closed when native mount inspection is unavailable', async () => {
    await assert.rejects(
        () =>
            detectPublicationFilesystem('/private/tmp', {
                platform: 'darwin',
                statfsProvider: async () => ({ type: 24, bsize: 4096 }),
                commandRunner: async () => {
                    throw new Error('native command unavailable');
                },
            }),
        /native command unavailable/
    );
});

test('current filesystem matches a supported profile and executes the real publication protocol', async () => {
    const result = await assertSupportedPublicationEnvironment({
        root: tmpdir(),
    });
    assert.ok(['linux-ext4', 'macos-apfs'].includes(result.profile.id));
    assert.ok(result.detected.block_size > 0);
});

test('an incorrect CI filesystem declaration is rejected', async () => {
    const wrongProfile =
        process.platform === 'darwin' ? 'linux-ext4' : 'macos-apfs';
    await assert.rejects(
        () =>
            assertSupportedPublicationEnvironment({
                root: tmpdir(),
                expectedProfileId: wrongProfile,
            }),
        /expected profile/
    );
});
