#!/usr/bin/env node
import { tmpdir } from 'node:os';

import { assertSupportedPublicationEnvironment } from './core/publication-durability.mjs';

const args = process.argv.slice(2);
let expectedProfileId = process.env.CMZ_PUBLICATION_PROFILE;
for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--profile' && args[index + 1]) {
        expectedProfileId = args[index + 1];
        index += 1;
        continue;
    }
    throw new Error(
        'usage: check-publication-durability [--profile <filesystem-profile-id>]'
    );
}

const result = await assertSupportedPublicationEnvironment({
    root: tmpdir(),
    expectedProfileId,
});

console.log('Generator publication durability environment: OK');
console.log(`  profile: ${result.profile.id}`);
console.log(`  runner: ${result.profile.ci_runner}`);
console.log(
    `  statfs: ${result.detected.platform}:${result.detected.statfs_type}, block=${result.detected.block_size}`
);
console.log('  reader model: offline activation after publication success');
