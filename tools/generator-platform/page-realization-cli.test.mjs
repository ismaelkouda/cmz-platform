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
            additionalFiles: [],
        }
    );
});

test('collecte une allowlist explicite de sous-composants colocalisés', () => {
    assert.deepEqual(
        parseArgs([
            '--app',
            'proof-app',
            '--page',
            'page_aaaaaaaaaaaaaaaa',
            '--allow-file',
            'page.filters.component.ts',
            '--allow-file',
            'page.filters.component.html',
            '--dry-run',
        ]),
        {
            appName: 'proof-app',
            pageId: 'page_aaaaaaaaaaaaaaaa',
            dryRun: true,
            additionalFiles: [
                'page.filters.component.ts',
                'page.filters.component.html',
            ],
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

test('active v5 seulement avec les trois autorités Git explicites', () => {
    const sha = 'a'.repeat(40);
    assert.deepEqual(
        parseArgs([
            '--app',
            'proof-app',
            '--page',
            'page_aaaaaaaaaaaaaaaa',
            '--layout-binding',
            'designs/proof.layout-binding.json',
            '--authority-commit',
            sha,
            '--base-commit',
            sha,
            '--dry-run',
        ]),
        {
            appName: 'proof-app',
            pageId: 'page_aaaaaaaaaaaaaaaa',
            layoutBindingPath: 'designs/proof.layout-binding.json',
            authorityCommitSha: sha,
            baseCommitSha: sha,
            dryRun: true,
            additionalFiles: [],
        }
    );
    assert.throws(
        () =>
            parseArgs([
                '--app',
                'proof-app',
                '--page',
                'page_aaaaaaaaaaaaaaaa',
                '--layout-binding',
                'designs/proof.layout-binding.json',
                '--dry-run',
            ]),
        /sont requis ensemble/
    );
});

test('refuse les autorités v5 ambiguës ou non canoniques', () => {
    const base = [
        '--app',
        'proof-app',
        '--page',
        'page_aaaaaaaaaaaaaaaa',
        '--layout-binding',
        'designs/proof.layout-binding.json',
        '--authority-commit',
        'a'.repeat(40),
        '--base-commit',
        'a'.repeat(40),
        '--dry-run',
    ];
    assert.throws(
        () =>
            parseArgs([
                ...base,
                '--layout-binding',
                'designs/other.layout-binding.json',
            ]),
        /ne peut apparaître qu'une fois/
    );
    assert.throws(
        () =>
            parseArgs(
                base.map((value) =>
                    value === 'a'.repeat(40) ? 'A'.repeat(40) : value
                )
            ),
        /SHA Git complet en minuscules/
    );
});
