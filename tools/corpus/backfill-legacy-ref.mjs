#!/usr/bin/env node
/**
 * backfill-legacy-ref.mjs
 *
 * Tamponne legacy_ref (depuis legacy.lock.json) sur toutes les paires
 * corpus/*.pairs.jsonl sans rejouer les oracles — audit B-4.
 *
 * Usage:
 *   node tools/corpus/backfill-legacy-ref.mjs [--dry-run]
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const CORPUS = join(ROOT, 'corpus');
const dryRun = process.argv.includes('--dry-run');

const lock = JSON.parse(readFileSync(join(ROOT, 'legacy.lock.json'), 'utf8'));
if (!lock.commit || !/^[0-9a-f]{40}$/i.test(lock.commit)) {
    console.error('legacy.lock.json#commit invalide');
    process.exit(1);
}

const legacyRef = {
    commit: String(lock.commit).toLowerCase(),
};
if (lock.repo) legacyRef.repo = lock.repo;
if (lock.date) legacyRef.date = lock.date;

const files = readdirSync(CORPUS).filter((f) => f.endsWith('.pairs.jsonl'));
let pairsTotal = 0;
let filesUpdated = 0;

for (const file of files) {
    const path = join(CORPUS, file);
    const lines = readFileSync(path, 'utf8').split('\n').filter(Boolean);
    const updated = lines.map((line) => {
        const pair = JSON.parse(line);
        pair.legacy_ref = legacyRef;
        pairsTotal++;
        return JSON.stringify(pair);
    });
    if (!dryRun) {
        writeFileSync(path, updated.join('\n') + '\n', 'utf8');
    }
    filesUpdated++;
    console.log(
        (dryRun ? '[dry-run] ' : '') +
            file +
            ' — ' +
            lines.length +
            ' paires + legacy_ref'
    );
}

console.log(
    (dryRun ? '[dry-run] ' : '') +
        filesUpdated +
        ' fichier(s), ' +
        pairsTotal +
        ' paires — commit ' +
        legacyRef.commit.slice(0, 12)
);
