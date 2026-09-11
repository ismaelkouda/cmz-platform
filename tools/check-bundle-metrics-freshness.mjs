#!/usr/bin/env node
/**
 * check-bundle-metrics-freshness.mjs
 *
 * Audit E-8 — même mécanisme que check-docs-freshness.mjs (STATUS_DATE),
 * appliqué à `apps/backoffice-angular/bundle-metrics.json`.
 *
 * record-bundle-metrics.mjs mesure un vrai build ET tamponne `measured_at`
 * à la date du jour, sans rapport avec le contenu mesuré. Une comparaison
 * naïve (`git diff` brut) échoue donc chaque nuit, même quand le bundle réel
 * n'a pas bougé d'un octet — seule la date diffère. Constat empirique :
 * 19/20 derniers runs `nightly-integration.yml` rouges pour cette raison
 * (+ un ordre de steps qui mesurait un dist pollué par les sourcemaps —
 * corrigé séparément dans ce même changement, cf. le job `integration`).
 *
 * Cette gate fige `BUNDLE_METRICS_DATE` sur la date déjà commitée avant de
 * relancer la mesure : seul un octet réellement différent (taille, nom de
 * chunk hashé, budget) fait échouer la comparaison — pas la date.
 *
 * Prérequis : dist/apps/backoffice-angular/browser à jour (vrai build
 * production, cf. record-bundle-metrics.mjs).
 *
 * Usage :
 *   node tools/check-bundle-metrics-freshness.mjs
 *   bun run check:bundle-metrics-freshness
 *
 * CI : job `integration` (nightly-integration.yml), après un build
 * production propre — jamais après le build --source-map=true, qui produit
 * un dist non représentatif (sourceMappingURL injecté = octets différents).
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RECORDER = join(ROOT, 'tools/record-bundle-metrics.mjs');
const TARGET = join(ROOT, 'apps/backoffice-angular/bundle-metrics.json');

function committedMeasuredAt() {
    if (!existsSync(TARGET)) return null;
    try {
        return JSON.parse(readFileSync(TARGET, 'utf8')).measured_at ?? null;
    } catch {
        return null;
    }
}

if (!existsSync(TARGET)) {
    console.error('FAIL  bundle-metrics.json absent : ' + TARGET);
    process.exit(1);
}

const frozenDate = committedMeasuredAt();
const before = readFileSync(TARGET);
const env = { ...process.env };
if (frozenDate) {
    env.BUNDLE_METRICS_DATE = frozenDate;
    console.log('INFO  BUNDLE_METRICS_DATE figée (commit) : ' + frozenDate);
} else {
    console.log(
        'INFO  bundle-metrics.json sans measured_at — mesure avec la date UTC du jour'
    );
}

try {
    execFileSync(process.execPath, [RECORDER], {
        cwd: ROOT,
        env,
        stdio: 'inherit',
    });
} catch {
    console.error('FAIL  record-bundle-metrics.mjs a échoué');
    process.exit(1);
}

const after = readFileSync(TARGET);
if (!before.equals(after)) {
    console.error('');
    console.error(
        'FAIL  check:bundle-metrics-freshness — bundle-metrics.json périmé (audit E-8)'
    );
    console.error('');
    console.error('Remède :');
    console.error(
        '  bun run bundle:metrics   # rebuild production + bun run bundle:record'
    );
    console.error('  git add apps/backoffice-angular/bundle-metrics.json');
    console.error(
        '  # si le total dépasse le budget project.json : voir ADR-0016 avant de committer'
    );
    process.exit(1);
}

console.log('OK  check:bundle-metrics-freshness — bundle-metrics.json à jour');
process.exit(0);
