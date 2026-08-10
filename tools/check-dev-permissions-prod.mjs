#!/usr/bin/env node
/**
 * T3-4 / DT-6 — garde-fou structurelle : le bypass dev des permissions ne
 * peut pas être enregistré hors `isDevMode()`.
 *
 * Vérifie (AST-lite, regex ancré) :
 * 1. `dev-permissions.provider.ts` fail-closed : `if (!isDevMode()) return []`
 * 2. Unique composition root : spread `...provideDevPermissions()` dans
 *    `app.config.ts` uniquement
 * 3. Aucun autre `provide: PermissionActionsService` hors ce fichier dev
 * 4. Import de `provideDevPermissions` uniquement depuis `app.config.ts`
 *
 * Usage : bun run check:dev-permissions-prod
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROVIDER = join(
    ROOT,
    'apps/backoffice-angular/src/app/dev/dev-permissions.provider.ts'
);
const APP_CONFIG = join(
    ROOT,
    'apps/backoffice-angular/src/app/app.config.ts'
);

/** @type {string[]} */
const errors = [];

function read(path) {
    return readFileSync(path, 'utf8');
}

function walkTsFiles(dir, acc = []) {
    for (const name of readdirSync(dir)) {
        if (
            name === 'node_modules' ||
            name === 'dist' ||
            name === '.git' ||
            name === '.cache'
        ) {
            continue;
        }
        const full = join(dir, name);
        const st = statSync(full);
        if (st.isDirectory()) {
            walkTsFiles(full, acc);
        } else if (name.endsWith('.ts') && !name.endsWith('.d.ts')) {
            acc.push(full);
        }
    }
    return acc;
}

// ── 1. Fail-closed isDevMode ─────────────────────────────────────────────
const providerSrc = read(PROVIDER);
if (!providerSrc.includes('isDevMode')) {
    errors.push(`${PROVIDER}: doit importer/appeler isDevMode()`);
}
// Accepte if (!isDevMode()) OU if (!isDev()) après extraction param
if (
    !/if\s*\(\s*!\s*isDev(?:Mode)?\s*\(\s*\)\s*\)\s*\{[^}]*return\s*\[\s*\]\s*;/s.test(
        providerSrc
    )
) {
    errors.push(
        `${PROVIDER}: garde isDev/isDevMode absente ou altérée — attendu ` +
            '`if (!isDev()) { return []; }` (défaut isDevMode)'
    );
}
// Signature : défaut = isDevMode Angular
if (
    !/isDev\s*:\s*\(\s*\)\s*=>\s*boolean\s*=\s*isDevMode/.test(providerSrc)
) {
    errors.push(
        `${PROVIDER}: paramètre isDev doit default à isDevMode (signature ` +
            '`isDev: () => boolean = isDevMode`)'
    );
}
if (!/export\s+function\s+provideDevPermissions\s*\(/.test(providerSrc)) {
    errors.push(`${PROVIDER}: export provideDevPermissions manquant`);
}

// ── 2. Unique call site app.config ───────────────────────────────────────
const configSrc = read(APP_CONFIG);
if (!configSrc.includes("from './dev/dev-permissions.provider'")) {
    errors.push(
        `${APP_CONFIG}: import provideDevPermissions depuis ./dev/… requis`
    );
}
if (!/\.\.\.\s*provideDevPermissions\s*\(\s*\)/.test(configSrc)) {
    errors.push(
        `${APP_CONFIG}: spread ...provideDevPermissions() requis (no-op prod)`
    );
}

function stripComments(src) {
    return src
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

// ── 3–4. Pas d'autre site d'import / d'override PermissionActionsService ─
const searchRoots = [
    join(ROOT, 'apps/backoffice-angular/src'),
    join(ROOT, 'libs'),
];
const allTs = searchRoots.flatMap((r) => walkTsFiles(r));

for (const file of allTs) {
    const rel = relative(ROOT, file);
    const src = stripComments(read(file));

    // Import du provider hors app.config + hors son propre fichier + hors spec
    if (
        !file.endsWith('dev-permissions.provider.ts') &&
        !file.endsWith('dev-permissions.provider.spec.ts') &&
        !file.endsWith('app.config.ts')
    ) {
        if (
            /import\s*\{[^}]*\bprovideDevPermissions\b/.test(src) ||
            /\bprovideDevPermissions\s*\(/.test(src)
        ) {
            errors.push(
                `${rel}: import/appel provideDevPermissions hors app.config (interdit — surface dev confinée)`
            );
        }
    }

    // Fourniture DI de PermissionActionsService hors shared real service +
    // hors double de test + hors provider dev
    if (
        /provide\s*:\s*PermissionActionsService/.test(src) &&
        !rel.includes('dev/dev-permissions.provider.ts') &&
        !rel.endsWith('.spec.ts') &&
        !rel.includes('permission-actions.service.ts')
    ) {
        errors.push(
            `${rel}: provide: PermissionActionsService hors provider DEV documenté (T3-4)`
        );
    }
}

if (errors.length) {
    console.error('check:dev-permissions-prod — ÉCHEC\n');
    for (const e of errors) console.error(`  • ${e}`);
    console.error(
        `\n${errors.length} violation(s). Le bypass permissions doit rester ` +
            'confiné à isDevMode() (T3-4 / DT-6).'
    );
    process.exit(1);
}

console.log(
    'check:dev-permissions-prod — OK (isDevMode fail-closed, call site unique)'
);
