#!/usr/bin/env node
/**
 * pin-legacy.mjs
 *
 * Met a jour legacy.lock.json depuis le HEAD de SEOS_LEGACY_ROOT.
 *
 * Usage:
 *   SEOS_LEGACY_ROOT=/chemin/legacy node tools/corpus/pin-legacy.mjs
 */

import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireLegacyRoot } from './legacy-root.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const LOCK_PATH = join(ROOT, 'legacy.lock.json');
const legacyRoot = requireLegacyRoot();

function git(args) {
    return execFileSync('git', args, {
        cwd: legacyRoot,
        encoding: 'utf8',
    }).trim();
}

const commit = git(['rev-parse', 'HEAD']);
const date = git(['log', '-1', '--format=%cs']);
let branch = '';
try {
    branch = git(['branch', '--show-current']);
} catch {
    branch = '';
}

let repo = '';
try {
    repo = git(['remote', 'get-url', 'origin']);
} catch {
    try {
        repo = git(['remote', 'get-url', 'cmz']);
    } catch {
        repo = '';
    }
}

let mirrors = [];
try {
    const cmz = git(['remote', 'get-url', 'cmz']);
    if (cmz && cmz !== repo) mirrors = [cmz];
} catch {
    // ignore
}

const lock = {
    repo:
        repo ||
        'https://gitlab.imako.digital/ansut-apps/cmz-backoffice-frontend.git',
    mirrors,
    commit,
    date,
    branch: branch || undefined,
    pinned_at: new Date().toISOString().slice(0, 10),
    rationale:
        'Audit B-3 / P0-6 — pin SHA for corpus reproducibility (ADR-0014)',
};

if (!lock.branch) delete lock.branch;

writeFileSync(LOCK_PATH, JSON.stringify(lock, null, 2) + '\n', 'utf8');
console.log('Pinned legacy.lock.json ← ' + commit + ' (' + date + ')');
console.log('  repo: ' + lock.repo);
console.log('  root: ' + legacyRoot);
