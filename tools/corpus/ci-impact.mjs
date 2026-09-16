#!/usr/bin/env node
/** Sélectionne la passe corpus coûteuse à partir du diff Git. */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DIRECT_INPUTS = [
    'corpus/',
    'tools/corpus/',
    'docs/architecture/corpus/pair.schema.json',
    'legacy.lock.json',
    '.github/workflows/ci.yml',
];
const PACKAGE_SCRIPT_RE = /^(?:corpus:|legacy:|check:(?:corpus|pair-schema))/;

function isDirectInput(path) {
    return (
        DIRECT_INPUTS.some((input) =>
            input.endsWith('/') ? path.startsWith(input) : path === input
        ) ||
        path === 'nx.json' ||
        /^libs\/[^/]+(?:\/[^/]+)?\/project\.json$/.test(path)
    );
}

export function relevantPackageScripts(pkg) {
    return Object.fromEntries(
        Object.entries(pkg?.scripts ?? {})
            .filter(([name]) => PACKAGE_SCRIPT_RE.test(name))
            .sort(([a], [b]) => a.localeCompare(b))
    );
}

export function classifyCorpusImpact(
    changedPaths,
    { packageBefore, packageAfter } = {}
) {
    const reasons = [];
    for (const path of [...new Set(changedPaths)].sort()) {
        if (isDirectInput(path)) reasons.push(path);
    }
    if (
        changedPaths.includes('package.json') &&
        JSON.stringify(relevantPackageScripts(packageBefore)) !==
            JSON.stringify(relevantPackageScripts(packageAfter))
    ) {
        reasons.push('package.json#scripts corpus/legacy');
    }
    return { deep: reasons.length > 0, reasons };
}

function readPackageAt(ref) {
    return JSON.parse(
        execFileSync('git', ['show', `${ref}:package.json`], {
            cwd: ROOT,
            encoding: 'utf8',
        })
    );
}

function main() {
    const args = process.argv.slice(2);
    const baseIndex = args.indexOf('--base');
    const base = baseIndex >= 0 ? args[baseIndex + 1] : undefined;
    if (!base) {
        console.error(
            'Usage: node tools/corpus/ci-impact.mjs --base <git-ref>'
        );
        process.exit(2);
    }
    const changedPaths = execFileSync(
        'git',
        ['diff', '--name-only', '--no-renames', `${base}...HEAD`],
        { cwd: ROOT, encoding: 'utf8' }
    )
        .split(/\r?\n/)
        .filter(Boolean);
    const packageChanged = changedPaths.includes('package.json');
    const result = classifyCorpusImpact(changedPaths, {
        packageBefore: packageChanged ? readPackageAt(base) : undefined,
        packageAfter: packageChanged
            ? JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'))
            : undefined,
    });
    console.error(
        result.deep
            ? `[corpus:impact] passe profonde requise : ${JSON.stringify(result.reasons)}`
            : `[corpus:impact] contrat rapide suffisant (${changedPaths.length} chemin(s) modifié(s))`
    );
    console.log(`deep=${result.deep}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
