import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseArgs } from './add-library.mjs';
import { parseArgs as parsePromotionArgs } from './promote-library-compatibility.mjs';

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

test('la qualification candidate est absente de la CLI produit', () => {
    assert.throws(
        () =>
            parseArgs([
                '--app',
                'demo',
                '--library',
                'tailwind',
                '--candidate',
            ]),
        /Argument inconnu/
    );
    assert.deepEqual(
        parsePromotionArgs(['--app', 'reference-app', '--library', 'tailwind']),
        { app: 'reference-app', library: 'tailwind' }
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
