#!/usr/bin/env node
/**
 * Orchestrateur de génération du Corpus SEOS — 18/18 modules.
 *
 * Exécute `emit-pairs.mjs` sur tous les modules du workspace (les 4 workflow-action,
 * les 4 read-only-view / aggregated-stats, et les 10 crud-entity).
 *
 * Usage:
 *   node tools/corpus/emit-all.mjs [--verify] [--structural-only]
 */

import { execSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

const ALL_MODULES = [
    // Workflow-action (4)
    'report-states',
    'processing',
    'requests',
    'finalization',

    // Read-only-view / aggregated-stats (4)
    'monitoring',
    'reporting',
    'dashboard',
    'interactive-map',

    // Crud-entity (10)
    'administrative-boundary',
    'administrative-infrastructure',
    'communication',
    'content-management',
    'coverage-areas',
    'settings-security',
    'team-organization',
    'authentication',
    'core',
    'shared',
];

const passArgs = process.argv.slice(2).join(' ');

console.log(
    `🚀 Lancement du Corpus SEOS sur l'ensemble des ${ALL_MODULES.length} modules...`
);

let successCount = 0;
let failCount = 0;
const failures = [];

for (const mod of ALL_MODULES) {
    console.log(`\n---------------------------------------------------------`);
    console.log(`📦 [Corpus SEOS] Traitement du module : ${mod}`);
    console.log(`---------------------------------------------------------`);
    try {
        const cmd = `node tools/corpus/emit-pairs.mjs ${mod} ${passArgs}`;
        execSync(cmd, {
            cwd: ROOT,
            stdio: 'inherit',
            env: process.env,
        });
        successCount++;
    } catch (err) {
        failCount++;
        failures.push(mod);
        console.error(`❌ Échec du module ${mod}`);
    }
}

console.log(`\n=========================================================`);
console.log(`📊 Bilan Corpus SEOS (${ALL_MODULES.length} modules) :`);
console.log(`  ✅ ${successCount} module(s) validé(s)`);
if (failCount > 0) {
    console.error(
        `  ❌ ${failCount} module(s) en échec : ${failures.join(', ')}`
    );
    process.exit(1);
} else {
    console.log(
        `🎉 100% des ${ALL_MODULES.length} modules sont validés par l'Oracle SEOS !`
    );
}
