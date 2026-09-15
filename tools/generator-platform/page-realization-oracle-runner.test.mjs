import assert from 'node:assert/strict';
import { test } from 'node:test';

import { invocation } from './page-realization-oracle-runner.mjs';

test('le test passe uniquement la configuration Vitest gouvernée', () => {
    const command = invocation('test', 'demo-app');

    assert.equal(command.script, 'node_modules/nx/dist/bin/nx.js');
    assert.deepEqual(command.argv, [
        'run',
        'demo-app:test',
        '--skipNxCache',
        '--runnerConfig=tools/generator-platform/page-realization-vitest.config.mjs',
    ]);
});

test('le runner refuse tout oracle hors de la liste fermée', () => {
    assert.throws(() => invocation('shell', 'demo-app'), /non autorisé/);
});
