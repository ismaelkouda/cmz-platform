#!/usr/bin/env node
/**
 * ensure-lib-build-targets.mjs
 *
 * Ajoute un target build (tsc --noEmit --project <lib>/tsconfig.json)
 * a toute lib sous libs/ qui n'en a pas encore.
 *
 * Usage:
 *   node tools/ensure-lib-build-targets.mjs [--dry-run]
 *
 * Audit A-4 — generer, ne pas ecrire a la main.
 */

import {
    existsSync,
    readdirSync,
    readFileSync,
    statSync,
    writeFileSync,
} from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const LIBS = join(ROOT, 'libs');
const dryRun = process.argv.includes('--dry-run');

const SKIP_DIRS = new Set([
    'node_modules',
    'dist',
    'out-tsc',
    '.git',
    '.angular',
]);

function findProjectJsons(dir, results = []) {
    for (const entry of readdirSync(dir)) {
        if (SKIP_DIRS.has(entry)) continue;
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
            findProjectJsons(full, results);
        } else if (entry === 'project.json') {
            results.push(full);
        }
    }
    return results;
}

function buildTarget(projectRootRel) {
    return {
        executor: 'nx:run-commands',
        options: {
            command:
                'tsc --noEmit --project ' + projectRootRel + '/tsconfig.json',
            cwd: '{workspaceRoot}',
        },
    };
}

const projectFiles = findProjectJsons(LIBS);
const added = [];
const skipped = [];
const errors = [];

for (const file of projectFiles) {
    const projectRoot = relative(ROOT, join(file, '..'));
    const tsconfigPath = join(ROOT, projectRoot, 'tsconfig.json');
    const project = JSON.parse(readFileSync(file, 'utf8'));

    if (project.targets && project.targets.build) {
        skipped.push(project.name || projectRoot);
        continue;
    }

    if (!existsSync(tsconfigPath)) {
        errors.push(projectRoot + ': tsconfig.json manquant');
        continue;
    }

    project.targets = Object.assign({}, project.targets || {}, {
        build: buildTarget(projectRoot),
    });

    // Remettre build en tete des targets pour stabilite de diff.
    const ordered = { build: project.targets.build };
    for (const key of Object.keys(project.targets)) {
        if (key !== 'build') ordered[key] = project.targets[key];
    }
    project.targets = ordered;

    const label = (project.name || projectRoot) + ' -> ' + projectRoot;
    if (!dryRun) {
        writeFileSync(file, JSON.stringify(project, null, 2) + '\n', 'utf8');
    }
    added.push(label);
}

if (dryRun) {
    console.log('[dry-run] Ajouterait build a ' + added.length + ' lib(s)');
} else {
    console.log('Ajoute build a ' + added.length + ' lib(s)');
}
for (const line of added) console.log('  + ' + line);
console.log('Deja presents : ' + skipped.length);
if (errors.length) {
    console.error('Erreurs :');
    for (const err of errors) console.error('  x ' + err);
    process.exit(1);
}
