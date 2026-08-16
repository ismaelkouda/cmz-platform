#!/usr/bin/env node
import { readFile, rename } from 'node:fs/promises';

import { commitDirectoryTransaction } from '../core/generation-transaction.mjs';

const [outputRoot, candidateRoot, journalPath, killAfterRaw] =
    process.argv.slice(2);
const killAfterRename = Number.parseInt(killAfterRaw, 10);

if (
    !outputRoot ||
    !candidateRoot ||
    !journalPath ||
    !Number.isInteger(killAfterRename) ||
    killAfterRename < 1
) {
    throw new Error(
        'usage: crash-publication-child <output> <candidate> <journal> <kill-after-rename>'
    );
}

const journal = JSON.parse(await readFile(journalPath, 'utf8'));
let renameCount = 0;

await commitDirectoryTransaction({
    outputRoot,
    candidateRoot,
    expectedState: 'present',
    journal,
    renamePath: async (from, to) => {
        await rename(from, to);
        renameCount += 1;
        if (renameCount === killAfterRename) {
            process.kill(process.pid, 'SIGKILL');
        }
    },
});

throw new Error(`failpoint was not reached after ${renameCount} renames`);
