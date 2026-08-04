#!/usr/bin/env node
/**
 * apply-branch-protection.mjs — audit G-2 / P1-13
 *
 * Applique la protection de branche `main` depuis
 * `.github/branch-protection.main.json` via `gh api` :
 * - status checks requis = jobs bloquants de `ci.yml`
 * - 1 approbation + relecture CODEOWNERS
 * - pas de force-push / pas de suppression de branche
 * - enforce_admins : true (la règle s'applique aussi aux admins)
 *
 * Prérequis :
 *   1. `gh auth login` (scope `repo` / admin sur le dépôt)
 *   2. remote GitHub configuré, ou `CMZ_GITHUB_REPO=owner/name`
 *   3. les checks listés ont déjà tourné au moins une fois sur le dépôt
 *      (sinon GitHub refuse de les enregistrer comme required)
 *
 * Usage :
 *   bun run protect:main
 *   bun run protect:main -- --dry-run
 *   CMZ_GITHUB_REPO=org/cmz-platform bun run protect:main
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const CONFIG_PATH = join(ROOT, '.github/branch-protection.main.json');
const dryRun = process.argv.includes('--dry-run');

function gh(args, { input, ignoreFail = false } = {}) {
    try {
        return execFileSync('gh', args, {
            cwd: ROOT,
            encoding: 'utf8',
            input,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: process.env,
        });
    } catch (err) {
        if (ignoreFail) return null;
        const detail =
            String(err.stderr || '') ||
            String(err.stdout || '') ||
            String(err.message || '');
        throw new Error(`gh ${args.join(' ')} failed:\n${detail}`);
    }
}

function resolveRepo() {
    if (process.env.CMZ_GITHUB_REPO) {
        return process.env.CMZ_GITHUB_REPO.trim();
    }
    try {
        const out = gh([
            'repo',
            'view',
            '--json',
            'nameWithOwner',
            '-q',
            '.nameWithOwner',
        ]);
        return out.trim();
    } catch {
        throw new Error(
            'Dépôt GitHub introuvable. Configurez un remote (`gh repo set-default`)\n' +
                'ou exportez CMZ_GITHUB_REPO=owner/name, après `gh auth login`.'
        );
    }
}

const raw = readFileSync(CONFIG_PATH, 'utf8');
const payload = JSON.parse(raw);
delete payload.$comment;

console.log(`Branche  : main`);
console.log(`Config   : ${CONFIG_PATH}`);
console.log(
    `Checks   : ${payload.required_status_checks.contexts.join(' · ')}`
);
console.log(
    `Reviews  : ${payload.required_pull_request_reviews.required_approving_review_count} approval(s), CODEOWNERS=${payload.required_pull_request_reviews.require_code_owner_reviews}`
);
console.log(
    `Force-push : ${payload.allow_force_pushes ? 'autorisé' : 'interdit'}`
);
console.log(`Admins liés : ${payload.enforce_admins}`);

if (dryRun) {
    console.log('\n--dry-run : payload qui serait envoyé :\n');
    console.log(JSON.stringify(payload, null, 2));
    process.exit(0);
}

try {
    gh(['auth', 'status']);
} catch {
    console.error(
        '✖ gh non authentifié. Lancez :\n\n  gh auth login\n\npuis réessayez `bun run protect:main`.'
    );
    process.exit(1);
}

const repo = resolveRepo();
console.log(`Repo     : ${repo}`);

const body = JSON.stringify(payload);
gh(
    [
        'api',
        '--method',
        'PUT',
        '-H',
        'Accept: application/vnd.github+json',
        '-H',
        'X-GitHub-Api-Version: 2022-11-28',
        `repos/${repo}/branches/main/protection`,
        '--input',
        '-',
    ],
    { input: body }
);

console.log('\n✔ Protection de `main` appliquée.');
console.log(
    `  Vérifier : gh api repos/${repo}/branches/main/protection --jq '{checks:.required_status_checks.contexts,reviews:.required_pull_request_reviews.required_approving_review_count,force:.allow_force_pushes}'`
);
console.log(
    '\nNote solo : avec 1 approbation requise, un second compte (ou une\n' +
        'revue croisée) est nécessaire pour merger — vous ne pouvez pas\n' +
        'approuver votre propre PR. Contournement temporaire : désactiver\n' +
        '`enforce_admins` dans branch-protection.main.json (non recommandé).'
);
