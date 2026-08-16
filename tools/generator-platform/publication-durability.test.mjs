import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import test from 'node:test';

import {
    assertSupportedPublicationEnvironment,
    loadPublicationDurabilityContract,
    validatePublicationDurabilityContract,
} from './core/publication-durability.mjs';

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
