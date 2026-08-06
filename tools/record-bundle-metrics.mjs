#!/usr/bin/env node
/**
 * record-bundle-metrics.mjs
 *
 * Audit E-8 / P1-9 — mesure le bundle initial **après** un build production
 * et écrit `apps/backoffice-angular/bundle-metrics.json` (source unique).
 *
 * Prérequis :
 *   bunx nx run backoffice-angular:build:production
 *
 * Usage :
 *   node tools/record-bundle-metrics.mjs
 *   bun run bundle:record
 *
 * Métrique canonique : Initial total (raw) = main-*.js + styles-*.css
 * (identique à la ligne « Initial total » du builder Angular).
 */

import {
    existsSync,
    readdirSync,
    readFileSync,
    statSync,
    writeFileSync,
} from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BROWSER = join(ROOT, 'dist/apps/backoffice-angular/browser');
const OUT = join(ROOT, 'apps/backoffice-angular/bundle-metrics.json');
const PROJECT_JSON = join(ROOT, 'apps/backoffice-angular/project.json');

function die(msg) {
    console.error(msg);
    process.exit(1);
}

if (!existsSync(BROWSER)) {
    die(
        [
            "FAIL  dist introuvable — lancer d'abord :",
            '  bunx nx run backoffice-angular:build:production',
            'Puis :',
            '  bun run bundle:record',
        ].join('\n')
    );
}

const indexHtml = join(BROWSER, 'index.html');
if (!existsSync(indexHtml)) {
    die('FAIL  index.html absent dans ' + relative(ROOT, BROWSER));
}

const html = readFileSync(indexHtml, 'utf8');
const jsInitial = [...html.matchAll(/src="([^"]+\.js)"/g)].map((m) => m[1]);
const cssInitial = [
    ...new Set(
        [...html.matchAll(/href="(styles-[^"]+\.css)"/g)].map((m) => m[1])
    ),
];

if (jsInitial.length === 0) {
    die('FAIL  aucun script initial dans index.html');
}

/** @type {{ file: string; bytes: number }[]} */
const initialFiles = [];
for (const name of [...new Set([...jsInitial, ...cssInitial])]) {
    const full = join(BROWSER, name);
    if (!existsSync(full)) {
        die('FAIL  fichier initial manquant : ' + name);
    }
    initialFiles.push({ file: name, bytes: statSync(full).size });
}

const initialBytes = initialFiles.reduce((n, f) => n + f.bytes, 0);

// ExcelJS lazy — plus gros chunk JS hors initial, contenant « exceljs »
let exceljs = null;
for (const name of readdirSync(BROWSER)) {
    if (!name.endsWith('.js') || jsInitial.includes(name)) continue;
    const full = join(BROWSER, name);
    const bytes = statSync(full).size;
    if (bytes < 500_000) continue;
    const head = readFileSync(full, 'utf8').slice(0, 200_000);
    if (/exceljs/i.test(head)) {
        if (!exceljs || bytes > exceljs.bytes) {
            exceljs = { file: name, bytes };
        }
    }
}

let budgetWarning = null;
let budgetError = null;
try {
    const project = JSON.parse(readFileSync(PROJECT_JSON, 'utf8'));
    const budgets =
        project.targets?.build?.configurations?.production?.budgets ?? [];
    const initial = budgets.find((b) => b.type === 'initial');
    if (initial) {
        budgetWarning = initial.maximumWarning ?? null;
        budgetError = initial.maximumError ?? null;
    }
} catch {
    /* ignore */
}

/** kB SI (÷1000) — aligné sur le tableau « Raw size » du builder Angular. */
function kb(bytes) {
    return Math.round((bytes / 1000) * 100) / 100;
}

const metrics = {
    schema: 1,
    configuration: 'production',
    measured_at: new Date().toISOString().slice(0, 10),
    output_path: 'dist/apps/backoffice-angular/browser',
    /** Métrique canonique docs / CI — raw size « Initial total » Angular. */
    initial_raw_bytes: initialBytes,
    initial_raw_kb: kb(initialBytes),
    initial_files: initialFiles,
    exceljs_lazy_raw_bytes: exceljs?.bytes ?? null,
    exceljs_lazy_raw_kb: exceljs ? kb(exceljs.bytes) : null,
    exceljs_lazy_file: exceljs?.file ?? null,
    budget_initial_warning: budgetWarning,
    budget_initial_error: budgetError,
    command: 'bunx nx run backoffice-angular:build:production',
};

writeFileSync(OUT, JSON.stringify(metrics, null, 2) + '\n', 'utf8');

console.log('✅ bundle-metrics.json ← ' + relative(ROOT, OUT));
console.log(
    `   Initial total (raw) : ${metrics.initial_raw_kb} kB (${metrics.initial_raw_bytes} octets)`
);
if (exceljs) {
    console.log(
        `   ExcelJS lazy (raw)  : ${metrics.exceljs_lazy_raw_kb} kB (${exceljs.file})`
    );
}
console.log(
    `   Budget project.json : warning ${budgetWarning} / error ${budgetError}`
);
