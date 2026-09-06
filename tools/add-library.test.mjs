import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseArgs } from './add-library.mjs';

test('parse le chemin nominal et les options reproductibles sans shell', () => {
    assert.deepEqual(
        parseArgs([
            '--app',
            'clean-street',
            '--library',
            'angular-material',
            '--dry-run',
            '--expect-plan',
            `library-plan:${'a'.repeat(64)}`,
        ]),
        {
            app: 'clean-street',
            library: 'angular-material',
            dryRun: true,
            expectPlan: `library-plan:${'a'.repeat(64)}`,
        }
    );
});

test('refuse valeurs absentes, identifiants dangereux et options dupliquées', () => {
    for (const argv of [
        ['--app', '../escape', '--library', 'tailwind'],
        ['--app', 'demo', '--library'],
        ['--app', 'demo', '--app', 'autre', '--library', 'tailwind'],
        ['--app', 'demo', '--library', 'tailwind', '--dry-run', '--dry-run'],
        ['--app', 'demo', '--library', 'tailwind', '--expect-plan', 'invalide'],
    ]) {
        assert.throws(() => parseArgs(argv));
    }
});
