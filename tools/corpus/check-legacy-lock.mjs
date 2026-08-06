#!/usr/bin/env node
/**
 * check-legacy-lock.mjs
 *
 * Audit B-3 / ADR-0014 — valide legacy.lock.json et, si SEOS_LEGACY_ROOT
 * est defini, exige que HEAD du working tree egale le commit pine.
 *
 * Usage:
 *   node tools/corpus/check-legacy-lock.mjs
 *
 * CI guardrails : toujours (schema + presence du lock).
 * Concordance SHA : seulement si SEOS_LEGACY_ROOT est defini.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const LOCK_PATH = join(ROOT, 'legacy.lock.json');

const REQUIRED = ['repo', 'commit', 'date'];

if (!existsSync(LOCK_PATH)) {
    console.error('FAIL  legacy.lock.json absent — ADR-0014 / audit B-3');
    process.exit(1);
}

let lock;
try {
    lock = JSON.parse(readFileSync(LOCK_PATH, 'utf8'));
} catch {
    console.error('FAIL  legacy.lock.json — JSON invalide');
    process.exit(1);
}

const missing = REQUIRED.filter(
    (k) => !lock[k] || String(lock[k]).trim() === ''
);
if (missing.length) {
    console.error(
        'FAIL  legacy.lock.json — champs manquants: ' + missing.join(', ')
    );
    process.exit(1);
}

if (!/^[0-9a-f]{40}$/i.test(lock.commit)) {
    console.error(
        'FAIL  legacy.lock.json#commit doit etre un SHA40, recu: ' + lock.commit
    );
    process.exit(1);
}

console.log(
    'OK  legacy.lock.json — ' +
        lock.commit.slice(0, 12) +
        ' (' +
        lock.date +
        ') ← ' +
        lock.repo
);

const legacyRoot = process.env.SEOS_LEGACY_ROOT?.trim();
if (!legacyRoot) {
    console.log(
        'OK  SEOS_LEGACY_ROOT absent — concordance SHA non verifiee (normal en CI structural-only)'
    );
    process.exit(0);
}

const root = resolve(legacyRoot);
if (!existsSync(join(root, '.git'))) {
    console.error("FAIL  SEOS_LEGACY_ROOT n'est pas un depot git: " + root);
    process.exit(1);
}

let head;
try {
    head = execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: root,
        encoding: 'utf8',
    }).trim();
} catch (err) {
    console.error('FAIL  git rev-parse HEAD impossible dans ' + root);
    console.error(String(err.message || err));
    process.exit(1);
}

if (head.toLowerCase() !== String(lock.commit).toLowerCase()) {
    console.error(
        'FAIL  SEOS_LEGACY_ROOT ne correspond pas au pin legacy.lock.json'
    );
    console.error('  attendu : ' + lock.commit);
    console.error('  actuel  : ' + head);
    console.error('  root    : ' + root);
    console.error('');
    console.error('Remedes:');
    console.error('  git -C "$SEOS_LEGACY_ROOT" checkout ' + lock.commit);
    console.error('  # ou re-piner: node tools/corpus/pin-legacy.mjs');
    process.exit(1);
}

console.log('OK  SEOS_LEGACY_ROOT HEAD == legacy.lock.json#commit');
process.exit(0);
