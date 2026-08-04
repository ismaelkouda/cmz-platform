#!/usr/bin/env node
/**
 * checkout-legacy.mjs
 *
 * Audit B-5 / ADR-0014 — clone le dépôt legacy au SHA de legacy.lock.json.
 * Utilisé par le job CI `corpus-full` (et localement pour un --verify complet).
 *
 * Usage:
 *   node tools/corpus/checkout-legacy.mjs [--dest DIR]
 *
 * Env:
 *   LEGACY_CHECKOUT_TOKEN — token pour origin/miroir privés
 *   SEOS_LEGACY_ROOT      — si déjà défini et HEAD == pin, no-op
 *
 * Side-effect CI : écrit SEOS_LEGACY_ROOT dans $GITHUB_ENV si présent.
 */

import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const LOCK_PATH = join(ROOT, 'legacy.lock.json');
const DEFAULT_DEST = join(ROOT, '.legacy-cmz-backoffice');

function die(msg) {
    console.error(msg);
    process.exit(1);
}

function git(args, opts = {}) {
    return execFileSync('git', args, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        ...opts,
    }).trim();
}

function parseArgs(argv) {
    let dest = DEFAULT_DEST;
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--dest') {
            dest = resolve(argv[++i] ?? '');
            if (!dest || dest === resolve('')) {
                die('--dest requiert un chemin');
            }
        } else if (argv[i] === '--help' || argv[i] === '-h') {
            console.log(
                'Usage: node tools/corpus/checkout-legacy.mjs [--dest DIR]\n' +
                    'Env: LEGACY_CHECKOUT_TOKEN (origin/miroir privés)'
            );
            process.exit(0);
        }
    }
    return { dest };
}

function withToken(url, token) {
    if (!token || !url.startsWith('https://')) {
        return url;
    }
    // oauth2:TOKEN@host — compatible GitLab ; GitHub accepte aussi x-access-token
    const user = url.includes('github.com') ? 'x-access-token' : 'oauth2';
    return url.replace('https://', `https://${user}:${encodeURIComponent(token)}@`);
}

function commitReachable(url, commit) {
    try {
        const out = git(['ls-remote', url, commit]);
        return out.split('\n').some((line) => line.toLowerCase().startsWith(commit.toLowerCase()));
    } catch {
        return false;
    }
}

function headAt(dir) {
    try {
        return git(['rev-parse', 'HEAD'], { cwd: dir });
    } catch {
        return null;
    }
}

function exportEnv(dest) {
    const ghEnv = process.env.GITHUB_ENV;
    if (ghEnv) {
        appendFileSync(ghEnv, `SEOS_LEGACY_ROOT=${dest}\n`);
    }
}

if (!existsSync(LOCK_PATH)) {
    die('FAIL  legacy.lock.json absent — ADR-0014 / audit B-5');
}

let lock;
try {
    lock = JSON.parse(readFileSync(LOCK_PATH, 'utf8'));
} catch {
    die('FAIL  legacy.lock.json — JSON invalide');
}

if (!lock.repo || !/^[0-9a-f]{40}$/i.test(lock.commit ?? '')) {
    die('FAIL  legacy.lock.json — repo/commit invalides');
}

const { dest } = parseArgs(process.argv.slice(2));
const token = process.env.LEGACY_CHECKOUT_TOKEN?.trim() || '';
const commit = String(lock.commit).toLowerCase();

// Réutilise un working tree déjà piné (local ou cache runner)
const existingRoot = process.env.SEOS_LEGACY_ROOT?.trim();
if (existingRoot) {
    const root = resolve(existingRoot);
    const head = headAt(root);
    if (head && head.toLowerCase() === commit) {
        console.log('OK  SEOS_LEGACY_ROOT déjà au pin: ' + root);
        exportEnv(root);
        process.exit(0);
    }
}

if (existsSync(join(dest, '.git'))) {
    const head = headAt(dest);
    if (head && head.toLowerCase() === commit) {
        console.log('OK  checkout legacy déjà au pin: ' + dest);
        exportEnv(dest);
        process.exit(0);
    }
    console.log('INFO  destination existante hors pin — re-clone: ' + dest);
    rmSync(dest, { recursive: true, force: true });
} else if (existsSync(dest)) {
    rmSync(dest, { recursive: true, force: true });
}

const candidates = [];
const mirrors = Array.isArray(lock.mirrors) ? lock.mirrors : [];
for (const m of mirrors) {
    if (typeof m === 'string' && m.trim()) {
        candidates.push({ label: 'mirror', url: m.trim() });
    }
}
candidates.push({ label: 'origin', url: String(lock.repo).trim() });

let chosen = null;
for (const c of candidates) {
    const plain = c.url;
    if (commitReachable(plain, commit)) {
        chosen = { ...c, fetchUrl: plain };
        break;
    }
    if (token) {
        const authed = withToken(plain, token);
        if (authed !== plain && commitReachable(authed, commit)) {
            chosen = { ...c, fetchUrl: authed };
            break;
        }
    }
}

if (!chosen) {
    die(
        [
            'FAIL  impossible de résoudre le SHA legacy ' + commit,
            '  repo    : ' + lock.repo,
            '  mirrors : ' + (mirrors.length ? mirrors.join(', ') : '(aucun)'),
            '  token   : ' + (token ? 'défini' : 'absent (définir LEGACY_CHECKOUT_TOKEN)'),
            '',
            'Le job corpus-full nécessite un miroir public portant le pin,',
            'ou un secret LEGACY_CHECKOUT_TOKEN avec accès lecture au repo.',
        ].join('\n')
    );
}

mkdirSync(dirname(dest), { recursive: true });
console.log(
    'INFO  clone legacy ' +
        chosen.label +
        ' @ ' +
        commit.slice(0, 12) +
        ' → ' +
        dest
);

try {
    git(['init', dest]);
    git(['-C', dest, 'remote', 'add', 'origin', chosen.fetchUrl]);
    // Partial clone : métadonnées légères, blobs à la demande
    git(['-C', dest, 'fetch', '--filter=blob:none', '--depth=1', 'origin', commit]);
    git(['-C', dest, 'checkout', '--force', 'FETCH_HEAD']);
} catch (err) {
    die(
        'FAIL  checkout legacy: ' +
            String(err.stderr || err.message || err).trim()
    );
}

const head = headAt(dest);
if (!head || head.toLowerCase() !== commit) {
    die(
        'FAIL  HEAD après checkout ≠ pin\n  attendu: ' +
            commit +
            '\n  actuel : ' +
            (head ?? '(null)')
    );
}

console.log('OK  legacy checkout ' + head.slice(0, 12) + ' → ' + dest);
exportEnv(dest);
process.exit(0);
