import assert from 'node:assert/strict';
import test from 'node:test';

import { parseArgs } from '../prepare-page-realization.mjs';

test('parse le plan d’exécution optionnel sans ambiguïté', () => {
    assert.deepEqual(
        parseArgs([
            '--app',
            'proof-app',
            '--page',
            'page_aaaaaaaaaaaaaaaa',
            '--execution-plan',
            'generated/page-plan.json',
            '--dry-run',
        ]),
        {
            appName: 'proof-app',
            pageId: 'page_aaaaaaaaaaaaaaaa',
            pageExecutionPlanPath: 'generated/page-plan.json',
            dryRun: true,
        }
    );
});

test('refuse un argument de chemin sans valeur', () => {
    assert.throws(
        () =>
            parseArgs([
                '--app',
                'proof-app',
                '--page',
                'page_aaaaaaaaaaaaaaaa',
                '--execution-plan',
                '--dry-run',
            ]),
        /--execution-plan exige une valeur/
    );
});
