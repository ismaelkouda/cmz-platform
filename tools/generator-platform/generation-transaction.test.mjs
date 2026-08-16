import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import {
    cp,
    mkdtemp,
    mkdir,
    readFile,
    rename,
    rm,
    writeFile,
} from 'node:fs/promises';
import { hostname, tmpdir } from 'node:os';
import { resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { sha256, stableStringify } from './core/generation-manifest.mjs';
import {
    commitDirectoryTransaction,
    recoverInterruptedTransactions,
} from './core/generation-transaction.mjs';
import { generateActionRequest } from './generate-action-request.mjs';
import { loadJson } from './validate-ir.mjs';

const actionDefinitionUrl = new URL(
    'sources/support-request.definition.json',
    import.meta.url
);
const crashPublicationChildUrl = new URL(
    'test-support/crash-publication-child.mjs',
    import.meta.url
);

async function transactionJournal(outputRoot, hadPrevious, phase) {
    const controlManifest = await loadJson(
        resolve(outputRoot, 'generation-control-manifest.json')
    );
    const targets = {};
    for (const target of ['angular', 'reactjs']) {
        try {
            targets[target] = sha256(
                stableStringify(
                    await loadJson(
                        resolve(outputRoot, target, 'generation-manifest.json')
                    )
                )
            );
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }
    }
    return {
        schema_version: '1.0.0',
        output_root: outputRoot,
        had_previous: hadPrevious,
        phase,
        change_set_id: `changes:${'a'.repeat(64)}`,
        expected_control_manifest_sha256: sha256(
            stableStringify(controlManifest)
        ),
        expected_target_manifest_sha256: targets,
    };
}

async function runCrashPublicationChild({
    outputRoot,
    candidateRoot,
    journalPath,
    killAfterRename,
}) {
    return new Promise((resolvePromise, rejectPromise) => {
        const child = spawn(
            process.execPath,
            [
                fileURLToPath(crashPublicationChildUrl),
                outputRoot,
                candidateRoot,
                journalPath,
                String(killAfterRename),
            ],
            { stdio: ['ignore', 'pipe', 'pipe'] }
        );
        let standardError = '';
        child.stderr.setEncoding('utf8');
        child.stderr.on('data', (chunk) => {
            standardError += chunk;
        });
        child.once('error', rejectPromise);
        child.once('exit', (code, signal) => {
            resolvePromise({ code, signal, standardError });
        });
    });
}

test('a stale local lock is reclaimed but a live lock is never stolen', async () => {
    const temporaryRoot = await mkdtemp(resolve(tmpdir(), 'cmz-lock-owner-'));
    const outputRoot = resolve(temporaryRoot, 'generated-support');
    const lockRoot = resolve(
        temporaryRoot,
        '.generated-support.generation-lock'
    );
    try {
        await generateActionRequest({
            definitionPath: fileURLToPath(actionDefinitionUrl),
            outputRoot,
            target: 'all',
        });
        await mkdir(lockRoot);
        await writeFile(
            resolve(lockRoot, 'owner.json'),
            `${JSON.stringify({
                schema_version: '1.0.0',
                pid: 99999999,
                hostname: hostname(),
                started_at: new Date(0).toISOString(),
            })}\n`
        );
        const reviewed = await generateActionRequest({
            definitionPath: fileURLToPath(actionDefinitionUrl),
            outputRoot,
            target: 'all',
            dryRun: true,
        });
        const recovered = await generateActionRequest({
            definitionPath: fileURLToPath(actionDefinitionUrl),
            outputRoot,
            target: 'all',
            applyChangeSetId: reviewed.changeSet.change_set_id,
        });
        assert.equal(recovered.publication.status, 'applied');

        await mkdir(lockRoot);
        await writeFile(
            resolve(lockRoot, 'owner.json'),
            `${JSON.stringify({
                schema_version: '1.0.0',
                pid: process.pid,
                hostname: hostname(),
                started_at: new Date().toISOString(),
            })}\n`
        );
        const blockedPlan = await generateActionRequest({
            definitionPath: fileURLToPath(actionDefinitionUrl),
            outputRoot,
            target: 'all',
            dryRun: true,
        });
        await assert.rejects(
            () =>
                generateActionRequest({
                    definitionPath: fileURLToPath(actionDefinitionUrl),
                    outputRoot,
                    target: 'all',
                    applyChangeSetId: blockedPlan.changeSet.change_set_id,
                }),
            /another generation owns/
        );
    } finally {
        await rm(temporaryRoot, { recursive: true, force: true });
    }
});

test('recovery restores the previous output after a crash between renames', async () => {
    const temporaryRoot = await mkdtemp(
        resolve(tmpdir(), 'cmz-recover-previous-')
    );
    const outputRoot = resolve(temporaryRoot, 'generated-support');
    const transactionRoot = resolve(
        temporaryRoot,
        '.generated-support.generation-transaction-crashed'
    );
    try {
        await generateActionRequest({
            definitionPath: fileURLToPath(actionDefinitionUrl),
            outputRoot,
            target: 'all',
        });
        const journal = await transactionJournal(
            outputRoot,
            true,
            'previous-moved'
        );
        await mkdir(transactionRoot);
        await writeFile(
            resolve(transactionRoot, 'transaction-journal.json'),
            `${JSON.stringify(journal, null, 2)}\n`
        );
        await rename(outputRoot, resolve(transactionRoot, 'previous'));
        await recoverInterruptedTransactions(outputRoot);
        assert.equal(
            (await loadJson(resolve(outputRoot, 'semantic-model.json'))).domain
                .id,
            'support'
        );
        await assert.rejects(
            () =>
                readFile(resolve(transactionRoot, 'transaction-journal.json')),
            { code: 'ENOENT' }
        );
    } finally {
        await rm(temporaryRoot, { recursive: true, force: true });
    }
});

test('recovery restores the previous output after the publisher is actually SIGKILLed on the first rename', async () => {
    const temporaryRoot = await mkdtemp(
        resolve(tmpdir(), 'cmz-sigkill-after-previous-move-')
    );
    const outputRoot = resolve(temporaryRoot, 'generated-support');
    const transactionRoot = resolve(
        temporaryRoot,
        '.generated-support.generation-transaction-sigkill-first'
    );
    const candidateRoot = resolve(transactionRoot, 'candidate');
    const journalPath = resolve(transactionRoot, 'transaction-journal.json');
    try {
        await generateActionRequest({
            definitionPath: fileURLToPath(actionDefinitionUrl),
            outputRoot,
            target: 'all',
        });
        const journal = await transactionJournal(outputRoot, true, 'prepared');
        await mkdir(transactionRoot);
        await cp(outputRoot, candidateRoot, { recursive: true });
        await writeFile(journalPath, `${JSON.stringify(journal, null, 2)}\n`);

        const crashed = await runCrashPublicationChild({
            outputRoot,
            candidateRoot,
            journalPath,
            killAfterRename: 1,
        });
        assert.equal(crashed.code, null, crashed.standardError);
        assert.equal(crashed.signal, 'SIGKILL', crashed.standardError);
        await assert.rejects(
            () => readFile(resolve(outputRoot, 'semantic-model.json')),
            { code: 'ENOENT' }
        );

        await recoverInterruptedTransactions(outputRoot);
        assert.equal(
            (await loadJson(resolve(outputRoot, 'semantic-model.json'))).domain
                .id,
            'support'
        );
        await assert.rejects(() => readFile(journalPath), { code: 'ENOENT' });
    } finally {
        await rm(temporaryRoot, { recursive: true, force: true });
    }
});

test('recovery verifies the new output after the publisher is actually SIGKILLed on the second rename', async () => {
    const temporaryRoot = await mkdtemp(
        resolve(tmpdir(), 'cmz-sigkill-after-candidate-publish-')
    );
    const outputRoot = resolve(temporaryRoot, 'generated-support');
    const transactionRoot = resolve(
        temporaryRoot,
        '.generated-support.generation-transaction-sigkill-second'
    );
    const candidateRoot = resolve(transactionRoot, 'candidate');
    const journalPath = resolve(transactionRoot, 'transaction-journal.json');
    try {
        await generateActionRequest({
            definitionPath: fileURLToPath(actionDefinitionUrl),
            outputRoot,
            target: 'all',
        });
        const journal = await transactionJournal(outputRoot, true, 'prepared');
        await mkdir(transactionRoot);
        await cp(outputRoot, candidateRoot, { recursive: true });
        await writeFile(journalPath, `${JSON.stringify(journal, null, 2)}\n`);

        const crashed = await runCrashPublicationChild({
            outputRoot,
            candidateRoot,
            journalPath,
            killAfterRename: 2,
        });
        assert.equal(crashed.code, null, crashed.standardError);
        assert.equal(crashed.signal, 'SIGKILL', crashed.standardError);
        assert.equal(
            (await loadJson(journalPath)).phase,
            'previous-moved',
            'the kill must happen after the candidate rename and before the next journal phase'
        );

        await recoverInterruptedTransactions(outputRoot);
        assert.equal(
            (await loadJson(resolve(outputRoot, 'semantic-model.json'))).domain
                .id,
            'support'
        );
        await assert.rejects(() => readFile(journalPath), { code: 'ENOENT' });
    } finally {
        await rm(temporaryRoot, { recursive: true, force: true });
    }
});

test('recovery finalizes a published candidate only when its hashes match the journal', async () => {
    const temporaryRoot = await mkdtemp(
        resolve(tmpdir(), 'cmz-recover-published-')
    );
    const outputRoot = resolve(temporaryRoot, 'generated-support');
    const transactionRoot = resolve(
        temporaryRoot,
        '.generated-support.generation-transaction-published'
    );
    try {
        await generateActionRequest({
            definitionPath: fileURLToPath(actionDefinitionUrl),
            outputRoot,
            target: 'all',
        });
        const journal = await transactionJournal(
            outputRoot,
            true,
            'candidate-published'
        );
        await mkdir(transactionRoot);
        await cp(outputRoot, resolve(transactionRoot, 'previous'), {
            recursive: true,
        });
        await writeFile(
            resolve(transactionRoot, 'transaction-journal.json'),
            `${JSON.stringify(journal, null, 2)}\n`
        );
        await recoverInterruptedTransactions(outputRoot);
        assert.equal(
            (await loadJson(resolve(outputRoot, 'semantic-model.json'))).domain
                .id,
            'support'
        );
        await assert.rejects(
            () =>
                readFile(resolve(transactionRoot, 'transaction-journal.json')),
            { code: 'ENOENT' }
        );
    } finally {
        await rm(temporaryRoot, { recursive: true, force: true });
    }
});

test('recovery refuses a published tree whose artifact bytes contradict its journal', async () => {
    const temporaryRoot = await mkdtemp(
        resolve(tmpdir(), 'cmz-recover-drifted-published-')
    );
    const outputRoot = resolve(temporaryRoot, 'generated-support');
    const transactionRoot = resolve(
        temporaryRoot,
        '.generated-support.generation-transaction-drifted'
    );
    const semanticPath = resolve(outputRoot, 'semantic-model.json');
    try {
        await generateActionRequest({
            definitionPath: fileURLToPath(actionDefinitionUrl),
            outputRoot,
            target: 'all',
        });
        const journal = await transactionJournal(
            outputRoot,
            true,
            'candidate-published'
        );
        await mkdir(transactionRoot);
        await cp(outputRoot, resolve(transactionRoot, 'previous'), {
            recursive: true,
        });
        await writeFile(
            resolve(transactionRoot, 'transaction-journal.json'),
            `${JSON.stringify(journal, null, 2)}\n`
        );
        await writeFile(semanticPath, '{}\n');

        await assert.rejects(
            () => recoverInterruptedTransactions(outputRoot),
            /ambiguous interrupted transaction/
        );
        assert.equal(
            (
                await loadJson(
                    resolve(transactionRoot, 'previous/semantic-model.json')
                )
            ).domain.id,
            'support'
        );
        assert.equal(await readFile(semanticPath, 'utf8'), '{}\n');
    } finally {
        await rm(temporaryRoot, { recursive: true, force: true });
    }
});

test('initial-generation recovery verifies output even before the published phase was journaled', async () => {
    const temporaryRoot = await mkdtemp(
        resolve(tmpdir(), 'cmz-recover-initial-published-')
    );
    const outputRoot = resolve(temporaryRoot, 'generated-support');
    const transactionRoot = resolve(
        temporaryRoot,
        '.generated-support.generation-transaction-initial-published'
    );
    try {
        await generateActionRequest({
            definitionPath: fileURLToPath(actionDefinitionUrl),
            outputRoot,
            target: 'all',
        });
        const journal = await transactionJournal(outputRoot, false, 'prepared');
        await mkdir(transactionRoot);
        await writeFile(
            resolve(transactionRoot, 'transaction-journal.json'),
            `${JSON.stringify(journal, null, 2)}\n`
        );
        await writeFile(resolve(outputRoot, 'semantic-model.json'), '{}\n');

        await assert.rejects(
            () => recoverInterruptedTransactions(outputRoot),
            /published transaction .* does not match journal/
        );
        assert.equal(
            await readFile(resolve(outputRoot, 'semantic-model.json'), 'utf8'),
            '{}\n'
        );
    } finally {
        await rm(temporaryRoot, { recursive: true, force: true });
    }
});

test('recovery rejects an over-specified transaction journal', async () => {
    const temporaryRoot = await mkdtemp(
        resolve(tmpdir(), 'cmz-recover-invalid-journal-')
    );
    const outputRoot = resolve(temporaryRoot, 'generated-support');
    const transactionRoot = resolve(
        temporaryRoot,
        '.generated-support.generation-transaction-invalid-journal'
    );
    try {
        await generateActionRequest({
            definitionPath: fileURLToPath(actionDefinitionUrl),
            outputRoot,
            target: 'all',
        });
        const journal = await transactionJournal(outputRoot, true, 'prepared');
        journal.undeclared_field = true;
        await mkdir(transactionRoot);
        await writeFile(
            resolve(transactionRoot, 'transaction-journal.json'),
            `${JSON.stringify(journal, null, 2)}\n`
        );
        await assert.rejects(
            () => recoverInterruptedTransactions(outputRoot),
            /invalid transaction journal/
        );
        assert.equal(
            (
                await loadJson(
                    resolve(transactionRoot, 'transaction-journal.json')
                )
            ).undeclared_field,
            true
        );
    } finally {
        await rm(temporaryRoot, { recursive: true, force: true });
    }
});

test('a durability error after moving the previous tree rolls it back before cleanup', async () => {
    const temporaryRoot = await mkdtemp(
        resolve(tmpdir(), 'cmz-previous-move-sync-failure-')
    );
    const outputRoot = resolve(temporaryRoot, 'generated');
    const transactionRoot = resolve(temporaryRoot, 'transaction');
    const candidateRoot = resolve(transactionRoot, 'candidate');
    try {
        await mkdir(outputRoot);
        await mkdir(transactionRoot);
        await mkdir(candidateRoot);
        await writeFile(resolve(outputRoot, 'version.txt'), 'previous\n');
        await writeFile(resolve(candidateRoot, 'version.txt'), 'candidate\n');
        let renameCount = 0;
        await assert.rejects(
            () =>
                commitDirectoryTransaction({
                    outputRoot,
                    candidateRoot,
                    renamePath: async (from, to) => {
                        renameCount += 1;
                        await rename(from, to);
                        if (renameCount === 1) {
                            const error = new Error(
                                'injected directory sync failure'
                            );
                            error.code = 'EIO';
                            throw error;
                        }
                    },
                }),
            /injected directory sync failure/
        );
        assert.equal(renameCount, 2);
        assert.equal(
            await readFile(resolve(outputRoot, 'version.txt'), 'utf8'),
            'previous\n'
        );
        assert.equal(
            await readFile(resolve(candidateRoot, 'version.txt'), 'utf8'),
            'candidate\n'
        );
    } finally {
        await rm(temporaryRoot, { recursive: true, force: true });
    }
});

test('initial publication rolls the candidate back when the durable journal cannot advance', async () => {
    const temporaryRoot = await mkdtemp(
        resolve(tmpdir(), 'cmz-initial-journal-rollback-')
    );
    const outputRoot = resolve(temporaryRoot, 'generated');
    const transactionRoot = resolve(temporaryRoot, 'transaction');
    const candidateRoot = resolve(transactionRoot, 'candidate');
    try {
        await mkdir(transactionRoot);
        await mkdir(candidateRoot);
        await writeFile(resolve(candidateRoot, 'version.txt'), 'candidate\n');
        const journal = {};
        journal.circular = journal;

        await assert.rejects(
            () =>
                commitDirectoryTransaction({
                    outputRoot,
                    candidateRoot,
                    expectedState: 'absent',
                    journal,
                }),
            /circular structure/i
        );
        await assert.rejects(
            () => readFile(resolve(outputRoot, 'version.txt')),
            { code: 'ENOENT' }
        );
        assert.equal(
            await readFile(resolve(candidateRoot, 'version.txt'), 'utf8'),
            'candidate\n'
        );
    } finally {
        await rm(temporaryRoot, { recursive: true, force: true });
    }
});

test('directory commit rolls back when candidate publication fails', async () => {
    const temporaryRoot = await mkdtemp(
        resolve(tmpdir(), 'cmz-apply-rollback-')
    );
    const outputRoot = resolve(temporaryRoot, 'generated');
    const transactionRoot = resolve(temporaryRoot, 'transaction');
    const candidateRoot = resolve(transactionRoot, 'candidate');
    try {
        await mkdir(outputRoot);
        await mkdir(transactionRoot);
        await mkdir(candidateRoot);
        await writeFile(resolve(outputRoot, 'version.txt'), 'previous\n');
        await writeFile(resolve(candidateRoot, 'version.txt'), 'candidate\n');
        let renameCount = 0;
        await assert.rejects(
            () =>
                commitDirectoryTransaction({
                    outputRoot,
                    candidateRoot,
                    renamePath: async (from, to) => {
                        renameCount += 1;
                        if (renameCount === 2) {
                            const error = new Error('injected commit failure');
                            error.code = 'EIO';
                            throw error;
                        }
                        await rename(from, to);
                    },
                }),
            /injected commit failure/
        );
        assert.equal(renameCount, 3);
        assert.equal(
            await readFile(resolve(outputRoot, 'version.txt'), 'utf8'),
            'previous\n'
        );
    } finally {
        await rm(temporaryRoot, { recursive: true, force: true });
    }
});

test('a failed rollback preserves the previous tree at an explicit recovery path', async () => {
    const temporaryRoot = await mkdtemp(
        resolve(tmpdir(), 'cmz-apply-recovery-')
    );
    const outputRoot = resolve(temporaryRoot, 'generated');
    const transactionRoot = resolve(temporaryRoot, 'transaction');
    const candidateRoot = resolve(transactionRoot, 'candidate');
    try {
        await mkdir(outputRoot);
        await mkdir(transactionRoot);
        await mkdir(candidateRoot);
        await writeFile(resolve(outputRoot, 'version.txt'), 'previous\n');
        await writeFile(resolve(candidateRoot, 'version.txt'), 'candidate\n');
        let failure;
        try {
            await commitDirectoryTransaction({
                outputRoot,
                candidateRoot,
                renamePath: async (from, to) => {
                    if (from === outputRoot) {
                        await rename(from, to);
                        return;
                    }
                    const error = new Error('injected rename failure');
                    error.code = 'EIO';
                    throw error;
                },
            });
        } catch (error) {
            failure = error;
        }
        assert.ok(failure instanceof AggregateError);
        assert.equal(failure.preserveTransactionRoot, true);
        assert.equal(
            await readFile(
                resolve(failure.recoveryRoot, 'version.txt'),
                'utf8'
            ),
            'previous\n'
        );
    } finally {
        await rm(temporaryRoot, { recursive: true, force: true });
    }
});
