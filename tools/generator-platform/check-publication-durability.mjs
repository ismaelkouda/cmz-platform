#!/usr/bin/env node
import { tmpdir } from 'node:os';

import { assertSupportedPublicationEnvironment } from './core/publication-durability.mjs';

const args = process.argv.slice(2);
let expectedProfileId = process.env.CMZ_PUBLICATION_PROFILE;
let expectedPlatform = process.env.CMZ_PUBLICATION_PLATFORM;
for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--profile' && args[index + 1]) {
        expectedProfileId = args[index + 1];
        index += 1;
        continue;
    }
    if (args[index] === '--platform' && args[index + 1]) {
        expectedPlatform = args[index + 1];
        index += 1;
        continue;
    }
    throw new Error(
        'usage: check-publication-durability [--profile <filesystem-profile-id>] [--platform <linux|darwin>]'
    );
}

const result = await assertSupportedPublicationEnvironment({
    root: tmpdir(),
    expectedProfileId,
    expectedPlatform,
});

console.log('Generator publication durability environment: OK');
console.log(`  profile: ${result.profile.id}`);
console.log(`  runner: ${result.profile.ci_runner}`);
console.log(
    `  statfs: ${result.detected.platform}:${result.detected.statfs_type}, block=${result.detected.block_size}`
);
console.log('  reader model: offline activation after publication success');
