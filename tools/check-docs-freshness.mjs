#!/usr/bin/env node
/**
 * check-docs-freshness.mjs
 *
 * Audit E-5 / P1-9 — les blocs générés doivent être à jour dans Git.
 *
 * 1. Relance `generate-status.mjs` (date figée sur celle déjà commitée
 *    pour éviter un faux rouge quotidien).
 * 2. `git diff --exit-code` sur les fichiers générés → doc périmée = exit 1.
 *
 * Usage :
 *   node tools/check-docs-freshness.mjs
 *   bun run check:docs-freshness
 *
 * CI : job `docs-freshness`.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GENERATOR = join(ROOT, 'tools/generate-status.mjs');
const TRACKED = [
    'STATUS.md',
    'README.md',
    'LLM_CONTEXT.md',
    'docs/architecture/etat-du-socle.md',
    'docs/adr/README.md',
    'docs/README.md',
    // bundle-metrics.json est la source mesurée (bundle:record), pas régénérée ici
];

function committedStatusDate() {
    const statusPath = join(ROOT, 'STATUS.md');
    if (!existsSync(statusPath)) return null;
    const text = readFileSync(statusPath, 'utf8');
    const m = text.match(/le (\d{4}-\d{2}-\d{2})\./);
    return m?.[1] ?? null;
}

for (const f of TRACKED) {
    if (!existsSync(join(ROOT, f))) {
        console.error('FAIL  fichier généré absent : ' + f);
        process.exit(1);
    }
}

const frozenDate = committedStatusDate();
const env = { ...process.env };
if (frozenDate) {
    env.STATUS_DATE = frozenDate;
    console.log('INFO  STATUS_DATE figée (commit) : ' + frozenDate);
} else {
    console.log(
        'INFO  STATUS.md sans date — génération avec la date UTC du jour'
    );
}

try {
    execFileSync(process.execPath, [GENERATOR], {
        cwd: ROOT,
        env,
        stdio: 'inherit',
    });
} catch {
    console.error('FAIL  generate-status.mjs a échoué');
    process.exit(1);
}

try {
    execFileSync('git', ['diff', '--exit-code', '--', ...TRACKED], {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
    });
} catch (err) {
    if (err.status === 1) {
        console.error('');
        console.error(
            'FAIL  check:docs-freshness — documents générés périmés (audit E-5 / P1-9)'
        );
        console.error('');
        console.error(String(err.stdout || '').slice(0, 4000));
        console.error('');
        console.error('Remède :');
        console.error('  bun run generate:status');
        console.error(
            '  git add STATUS.md README.md LLM_CONTEXT.md docs/architecture/etat-du-socle.md docs/adr/README.md docs/README.md'
        );
        console.error(
            '  # si le bundle a changé : bun run bundle:metrics && git add apps/backoffice-angular/bundle-metrics.json'
        );
        process.exit(1);
    }
    console.error('FAIL  git diff : ' + String(err.stderr || err.message || err));
    process.exit(1);
}

console.log(
    'OK  check:docs-freshness — STATUS.md + blocs GENERATED à jour (' +
        TRACKED.join(', ') +
        ')'
);
process.exit(0);
