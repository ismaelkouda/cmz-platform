#!/usr/bin/env node
/**
 * check-declared-deps.mjs
 *
 * Audit D-1 / D-6 / P1-7 / ADR-0004 — intégrité du graphe déclaré :
 *
 *   1. Tout import externe d'une lib doit figurer dans son package.json
 *      (dependencies | peerDependencies | optionalDependencies | devDependencies).
 *   2. Réciproque (D-6) : toute dépendance déclarée doit être importée au moins
 *      une fois dans les sources de la lib (recouvre partiellement knip, au
 *      niveau package.json / arêtes Nx).
 *
 * Le graphe Nx package-based est déclaré, pas déduit des sources
 * (`analyzeSourceFiles: false`). Une arête absente ou fantôme fausse
 * `nx affected` / `nx graph`.
 *
 * Usage:
 *   node tools/check-declared-deps.mjs
 *   bun run check:declared-deps
 *
 * CI: job guardrails. Script npm: check:declared-deps.
 */

import { builtinModules } from 'node:module';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const LIBS = join(ROOT, 'libs');

const SKIP_DIRS = new Set([
    'node_modules',
    'dist',
    'out-tsc',
    'coverage',
    '.git',
    '.angular',
]);

const SOURCE_EXT = /\.(mts|cts|tsx|ts)$/;

const DEPENDENCY_FIELDS = [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
];

/**
 * Packages déclarables sans import source (types ambiants, tooling).
 * Liste courte — toute entrée doit être justifiée.
 */
const UNUSED_ALLOWLIST = new Set([
    // Helpers TS émis parfois sans import source explicite
    'tslib',
    // Compilateur — jamais en `from 'typescript'` ; résolu via catalog tooling racine
    'typescript',
]);

/**
 * Exceptions scopées à un package précis (contrairement à
 * UNUSED_ALLOWLIST, globale à tout le repo) — utile quand la
 * dépendance non importée est légitime pour CE package mais ne
 * devrait pas être blanchie partout ailleurs.
 * @type {Map<string, Set<string>>} selfName -> noms de deps exemptés
 */
const UNUSED_ALLOWLIST_BY_PACKAGE = new Map([]);

/** @param {string} name */
function isAmbientTypesPackage(name) {
    return name.startsWith('@types/');
}

const BUILTINS = new Set([
    ...builtinModules,
    ...builtinModules.map((m) => `node:${m}`),
]);

/** Specifiers à ignorer (relatifs, virtuels, tests runners non-package). */
function shouldIgnoreSpecifier(spec) {
    if (!spec) return true;
    if (spec.startsWith('.') || spec.startsWith('/')) return true;
    if (spec.startsWith('node:')) return true;
    if (BUILTINS.has(spec)) return true;
    // Angular compiler / tooling virtual
    if (spec.startsWith('@angular/') && spec.includes('!')) return true;
    return false;
}

/**
 * Résout le nom de package npm d'un specifier d'import.
 * @param {string} spec
 * @returns {string | null}
 */
function packageNameOf(spec) {
    if (shouldIgnoreSpecifier(spec)) return null;
    if (spec.startsWith('@')) {
        const parts = spec.split('/');
        if (parts.length < 2) return null;
        return `${parts[0]}/${parts[1]}`;
    }
    return spec.split('/')[0] || null;
}

/**
 * Specifiers via `from 'pkg'`, side-effect `import 'pkg'`, dynamic import,
 * require. `from` couvre les imports multilignes `{ … } from 'pkg'`.
 */
const SPECIFIER_RES = [
    /\bfrom\s*['"]([^'"]+)['"]/g,
    /\bimport\s*['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
];

/**
 * @param {string} source
 * @returns {Set<string>}
 */
function extractPackageImports(source) {
    const pkgs = new Set();
    const cleaned = source
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');

    for (const re of SPECIFIER_RES) {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(cleaned)) !== null) {
            const pkg = packageNameOf(m[1]);
            if (pkg) pkgs.add(pkg);
        }
    }
    return pkgs;
}

function walkSourceFiles(dir, results = []) {
    if (!existsSync(dir)) return results;
    for (const entry of readdirSync(dir)) {
        if (SKIP_DIRS.has(entry)) continue;
        const full = join(dir, entry);
        const st = statSync(full);
        if (st.isDirectory()) {
            walkSourceFiles(full, results);
        } else if (SOURCE_EXT.test(entry)) {
            results.push(full);
        }
    }
    return results;
}

function findLibPackageJsons(dir, results = []) {
    for (const entry of readdirSync(dir)) {
        if (SKIP_DIRS.has(entry)) continue;
        const full = join(dir, entry);
        if (!statSync(full).isDirectory()) continue;
        const pkgPath = join(full, 'package.json');
        if (existsSync(pkgPath)) {
            results.push(pkgPath);
        } else {
            findLibPackageJsons(full, results);
        }
    }
    return results;
}

/** @returns {Map<string, string>} name -> field (dependencies, …) */
function declaredPackagesByField(pkg) {
    const declared = new Map();
    for (const field of DEPENDENCY_FIELDS) {
        const block = pkg[field];
        if (!block || typeof block !== 'object') continue;
        for (const name of Object.keys(block)) {
            if (!declared.has(name)) declared.set(name, field);
        }
    }
    return declared;
}

const manifests = findLibPackageJsons(LIBS);
if (manifests.length === 0) {
    console.error('FAIL  aucune lib package.json sous libs/');
    process.exit(1);
}

/** @type {{ lib: string; pkg: string; missing: string[]; files: Map<string, string[]> }[]} */
const missingViolations = [];
/** @type {{ lib: string; pkg: string; unused: { name: string; field: string }[] }[]} */
const unusedViolations = [];

for (const pkgPath of manifests.sort()) {
    let pkg;
    try {
        pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    } catch {
        console.error(
            'FAIL  package.json invalide: ' + relative(ROOT, pkgPath)
        );
        process.exit(1);
    }

    const selfName = pkg.name;
    if (!selfName) {
        console.error(
            'FAIL  package.json sans name: ' + relative(ROOT, pkgPath)
        );
        process.exit(1);
    }

    const libRoot = join(pkgPath, '..');
    const declaredByField = declaredPackagesByField(pkg);
    const declared = new Set(declaredByField.keys());
    declared.add(selfName); // auto-import / barrel internal — toléré

    const used = new Map(); // pkg -> [files]
    for (const file of walkSourceFiles(libRoot)) {
        let source;
        try {
            source = readFileSync(file, 'utf8');
        } catch {
            continue;
        }
        for (const dep of extractPackageImports(source)) {
            if (dep === selfName) continue;
            if (!used.has(dep)) used.set(dep, []);
            used.get(dep).push(relative(ROOT, file));
        }
    }

    const missing = [...used.keys()].filter((d) => !declared.has(d)).sort();
    if (missing.length) {
        const files = new Map();
        for (const d of missing) {
            files.set(d, used.get(d) ?? []);
        }
        missingViolations.push({
            lib: relative(ROOT, libRoot),
            pkg: selfName,
            missing,
            files,
        });
    }

    // D-6 — réciproque : déclaré mais jamais importé
    const unusedAllowlistForThisPackage =
        UNUSED_ALLOWLIST_BY_PACKAGE.get(selfName) ?? new Set();
    const unused = [...declaredByField.entries()]
        .filter(([name]) => name !== selfName)
        .filter(([name]) => !UNUSED_ALLOWLIST.has(name))
        .filter(([name]) => !unusedAllowlistForThisPackage.has(name))
        .filter(([name]) => !isAmbientTypesPackage(name))
        .filter(([name]) => !used.has(name))
        .map(([name, field]) => ({ name, field }))
        .sort((a, b) => a.name.localeCompare(b.name));

    if (unused.length) {
        unusedViolations.push({
            lib: relative(ROOT, libRoot),
            pkg: selfName,
            unused,
        });
    }
}

const missingEdgeCount = missingViolations.reduce(
    (n, v) => n + v.missing.length,
    0
);
const unusedEdgeCount = unusedViolations.reduce(
    (n, v) => n + v.unused.length,
    0
);

console.log(
    `OK  scan ${manifests.length} libs — imports ↔ package.json (ADR-0004 / D-1 + D-6)`
);

let failed = false;

if (missingViolations.length === 0) {
    console.log(
        'OK  check:declared-deps — 0 arête manquante (import sans déclaration)'
    );
} else {
    failed = true;
    console.error('');
    console.error(
        `FAIL  check:declared-deps — ${missingEdgeCount} arête(s) manquante(s) sur ${missingViolations.length} lib(s)`
    );
    console.error('');
    for (const v of missingViolations) {
        console.error(`${v.lib} (${v.pkg})`);
        for (const dep of v.missing) {
            const sample = (v.files.get(dep) ?? []).slice(0, 3);
            const more =
                (v.files.get(dep)?.length ?? 0) > 3
                    ? ` (+${(v.files.get(dep)?.length ?? 0) - 3})`
                    : '';
            console.error(`  - ${dep}`);
            for (const f of sample) {
                console.error(
                    `      ← ${f}${more && f === sample.at(-1) ? more : ''}`
                );
            }
        }
        console.error('');
    }
    console.error(
        'Remède: déclarer chaque package manquant dans dependencies (workspace:* / catalog:)'
    );
    console.error(
        'ou devDependencies (ex. vitest). Voir audit D-2 / ADR-0004.'
    );
}

if (unusedViolations.length === 0) {
    console.log(
        'OK  check:declared-deps — 0 arête fantôme (déclaré sans import)'
    );
} else {
    failed = true;
    console.error('');
    console.error(
        `FAIL  check:declared-deps — ${unusedEdgeCount} arête(s) fantôme(s) sur ${unusedViolations.length} lib(s) (D-6)`
    );
    console.error('');
    for (const v of unusedViolations) {
        console.error(`${v.lib} (${v.pkg})`);
        for (const { name, field } of v.unused) {
            console.error(`  - ${name}  [${field}]`);
        }
        console.error('');
    }
    console.error(
        'Remède: retirer la dépendance inutilisée du package.json (graphe Nx / ADR-0004).'
    );
    console.error(
        "Si un package est requis sans import source (rare), l'ajouter à UNUSED_ALLOWLIST avec justification."
    );
}

if (failed) {
    process.exit(1);
}

console.log('OK  check:declared-deps — graphe déclaré cohérent');
process.exit(0);
