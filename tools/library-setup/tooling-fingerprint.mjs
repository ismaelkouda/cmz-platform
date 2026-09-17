import { createHash } from 'node:crypto';
import { lstatSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { stableJson } from './library-plan.mjs';
import { qualificationOracleKeys } from './qualification-contracts.mjs';

const COMMON_QUALIFICATION_SOURCES = [
    'tools/check-library-setup-deps.mjs',
    'tools/check-library-setup.mjs',
    'tools/generator-platform/validate-ir.mjs',
    'tools/library-setup/add-library-core.mjs',
    'tools/library-setup/candidate-lease.mjs',
    'tools/library-setup/compatibility-promotion-runner.mjs',
    'tools/library-setup/compatibility-promotion.mjs',
    'tools/library-setup/compatibility.mjs',
    'tools/library-setup/dependency-resolution.mjs',
    'tools/library-setup/filesystem-snapshot.mjs',
    'tools/library-setup/git-tree.mjs',
    'tools/library-setup/install-protocol.mjs',
    'tools/library-setup/library-plan.mjs',
    'tools/library-setup/publication-transaction.mjs',
    'tools/library-setup/qualified-adapters.mjs',
    'tools/library-setup/qualification-contracts.mjs',
    'tools/library-setup/recipe-execution.mjs',
    'tools/library-setup/resolution-policy.mjs',
    'tools/library-setup/runtime-oracles/support.mjs',
    'tools/library-setup/runtime-proofs.mjs',
    'tools/library-setup/sandbox.mjs',
    'tools/library-setup/tooling-fingerprint.mjs',
];

/**
 * Liste fermée des sources propres à chaque oracle. Une clé absente échoue :
 * ajouter une acceptance sans déclarer sa surface d'invalidation ne peut donc
 * jamais produire une attestation silencieusement incomplète.
 */
export const QUALIFICATION_ORACLE_SOURCE_PATHS = new Map([
    [
        'angular/angular-material#material-component-compiles',
        [
            'tools/library-setup/runtime-oracles/material-component.mjs',
            'tools/library-setup/runtime-fixtures/material-probe.ts',
            'tools/library-setup/runtime-fixtures/tsconfig.material.json',
        ],
    ],
    [
        'angular/angular-material#offline-production-build',
        ['tools/library-setup/runtime-oracles/production-build.mjs'],
    ],
    [
        'angular/tailwind#sentinel-class-emits-rule',
        ['tools/library-setup/runtime-oracles/tailwind-sentinel.mjs'],
    ],
    [
        'angular/tailwind#offline-production-build',
        ['tools/library-setup/runtime-oracles/production-build.mjs'],
    ],
    [
        'angular/transloco#key-renders-translation',
        [
            'tools/library-setup/runtime-oracles/transloco-render.mjs',
            'tools/library-setup/runtime-fixtures/transloco-runtime-probe.mjs',
        ],
    ],
    [
        'angular/transloco#offline-production-build',
        ['tools/library-setup/runtime-oracles/production-build.mjs'],
    ],
    [
        'angular/angular-material#material-tailwind-cascade-order',
        ['tools/library-setup/runtime-oracles/material-tailwind-cascade.mjs'],
    ],
    [
        'angular/angular-material#material-tailwind-render-together',
        [
            'tools/library-setup/browser-provisioning.mjs',
            'tools/library-setup/runtime-oracles/material-tailwind-browser.mjs',
        ],
    ],
]);

function fail(message) {
    throw new Error(`library tooling fingerprint: ${message}`);
}

function sha256(content) {
    return createHash('sha256').update(content).digest('hex');
}

function regularFileHash(root, path) {
    const absolute = join(root, path);
    const stats = lstatSync(absolute);
    if (stats.isSymbolicLink() || !stats.isFile()) {
        fail(`entrée non régulière : ${path}`);
    }
    return sha256(readFileSync(absolute));
}

export function libraryRunnerSourcePaths(recipe, recipeRegistry) {
    const paths = new Set(COMMON_QUALIFICATION_SOURCES);
    if (recipe.install?.method === 'reference-derived') {
        paths.add(recipe.install.reference_tool);
    }
    for (const key of qualificationOracleKeys(recipe, recipeRegistry)) {
        const oraclePaths = QUALIFICATION_ORACLE_SOURCE_PATHS.get(key);
        if (!oraclePaths) fail(`sources d'oracle non déclarées : ${key}`);
        for (const path of oraclePaths) paths.add(path);
    }
    return [...paths].sort();
}

/** Empreintes explicites et auditables des seules sources de la qualification. */
export function libraryRunnerSourceHashes(root, recipe, recipeRegistry) {
    return Object.fromEntries(
        libraryRunnerSourcePaths(recipe, recipeRegistry).map((path) => [
            path,
            regularFileHash(root, path),
        ])
    );
}

/** Empreinte compacte portée par le plan, dérivée du manifeste fermé. */
export function libraryRunnerDigest(root, recipe, recipeRegistry) {
    return sha256(
        stableJson(libraryRunnerSourceHashes(root, recipe, recipeRegistry))
    );
}

/** Tout le sens fonctionnel d'une piste, hors état de promotion. */
export function compatibilityTrackDigest(track) {
    const { status: _status, verification: _verification, ...contract } = track;
    return sha256(stableJson(contract));
}
