import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { test } from 'node:test';

import {
    MODULE,
    REPO_ROOT,
    assertAwaitingFinalize,
    createWorkspace,
    exists,
    runRetire,
} from './retire-module-test-fixture.mjs';

test('le stockage transactionnel du dépôt est ignoré par Git', () => {
    const result = spawnSync(
        'git',
        ['check-ignore', '--quiet', '.cmz/retire-module-transactions/.probe'],
        { cwd: REPO_ROOT, encoding: 'utf8' }
    );
    assert.equal(result.status, 0, result.stderr);
});

test('refuse une dérive HEAD mais autorise abort pour récupérer', async (t) => {
    const root = await createWorkspace(t);
    const git = (...args) =>
        spawnSync(
            'git',
            [
                '-c',
                'user.name=CMZ Test',
                '-c',
                'user.email=cmz-test@example.invalid',
                ...args,
            ],
            { cwd: root, encoding: 'utf8' }
        );
    assert.equal(git('add', '.').status, 0);
    const initialCommit = git('commit', '--quiet', '-m', 'initial');
    assert.equal(initialCommit.status, 0, initialCommit.stderr);

    const first = runRetire(root, ['--module', MODULE]);
    assertAwaitingFinalize(first);
    const driftCommit = git(
        'commit',
        '--quiet',
        '--allow-empty',
        '-m',
        'drift'
    );
    assert.equal(driftCommit.status, 0, driftCommit.stderr);

    const resumed = runRetire(root, ['--resume', '--module', MODULE]);
    assert.equal(resumed.status, 1);
    assert.match(resumed.stderr, /HEAD ou branche a changé/);

    const aborted = runRetire(root, ['--abort', '--module', MODULE]);
    assert.equal(aborted.status, 0, aborted.stderr || aborted.stdout);
    assert.equal(await exists(join(root, 'libs', MODULE)), true);
});
