#!/usr/bin/env node
/**
 * check-project-names.mjs
 *
 * Vérifie que tous les project.json du monorepo respectent la convention
 * de nommage définie dans ADR-0003 : le champ "name" doit suivre le pattern
 * @cmz/<module>-<couche> ou @cmz/<singleton> (core, shared-*).
 *
 * Exceptions légitimes documentées :
 *   - @cmz/source   (racine du workspace)
 *   - @cmz/core     (singleton sans sous-couches, ADR-0003 §5b)
 *   - @cmz/shared-* (kernel transverse, ADR-0003 §5a)
 *
 * Utilisé en pre-push et en CI (Phase 06).
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const LIBS = join(ROOT, 'libs');

// Pattern canonique : @cmz/<module>-<couche>
const CANONICAL = /^@cmz\/[a-z][a-z0-9-]+-[a-z]+$/;
// Exceptions légitimes
const ALLOWED_EXCEPTIONS = new Set(['@cmz/core', '@cmz/source']);
const SHARED_PREFIX = '@cmz/shared-';

const SKIP_DIRS = new Set([
    'node_modules',
    'dist',
    'out-tsc',
    '.git',
    '.angular',
]);

/** Trouve récursivement tous les project.json sous un répertoire */
function findProjectJsons(dir, results = []) {
    for (const entry of readdirSync(dir)) {
        if (SKIP_DIRS.has(entry)) continue;
        const full = join(dir, entry);
        const st = statSync(full);
        if (st.isDirectory()) {
            findProjectJsons(full, results);
        } else if (entry === 'project.json') {
            results.push(full);
        }
    }
    return results;
}

let errors = 0;
const files = findProjectJsons(LIBS);

for (const file of files) {
    const rel = relative(ROOT, file);
    let parsed;
    try {
        parsed = JSON.parse(readFileSync(file, 'utf8'));
    } catch {
        console.error(`❌  ${rel} — JSON invalide`);
        errors++;
        continue;
    }

    const name = parsed.name;
    if (!name) {
        console.error(`❌  ${rel} — champ "name" absent`);
        errors++;
        continue;
    }

    const valid =
        CANONICAL.test(name) ||
        ALLOWED_EXCEPTIONS.has(name) ||
        name.startsWith(SHARED_PREFIX);

    if (!valid) {
        console.error(
            `❌  ${rel}\n    "name": "${name}"\n    Attendu : @cmz/<module>-<couche> (ex: @cmz/report-states-domain)`
        );
        errors++;
    }
}

if (errors === 0) {
    console.log(
        `✅  ${files.length} project.json — nommage conforme à ADR-0003`
    );
    process.exit(0);
} else {
    console.error(
        `\n${errors} violation(s) de nommage détectée(s). Voir ADR-0003 §Convention canonique.`
    );
    process.exit(1);
}
