#!/usr/bin/env node
/**
 * check:library-setup — garde-fou de configuration des bibliothèques gouvernées
 * (`conventions/libraries/<platform>/<library>.setup.json`), ADR-0041.
 * Plan des lots suivants : docs/architecture/library-setup-runtime-plan.md.
 *
 * Périmètre de CETTE version : paquets npm pour Angular / React, résolus via Bun
 * workspaces (package.json racine + catalog + bun.lock). Kotlin/Swift : hors
 * périmètre.
 *
 * Deux niveaux, volontairement distincts :
 *   - `static_invariants` : présence structurelle (garde-fou de DÉRIVE, pas une
 *     preuve de fonctionnement — un `@import 'tailwindcss'` peut exister sans
 *     que le CSS compile ; rien de version-spécifique ici) ;
 *   - `runtime_acceptance` : preuves réelles (compilation, règle CSS, coexistence
 *     navigateur), `status: harness-pending` = listé sans être exécuté (lot C).
 *
 * Sécurité : toute lecture — recette, schéma, fichier d'app, lockfile — est
 * confinée sous la racine du dépôt et traverse ZÉRO lien symbolique (lstat par
 * segment, y compris le dossier d'app lui-même). Toute app avec un `project.json`
 * régulier DOIT déclarer `.cmz/libraries.json`. Une plateforme indéterminable
 * échoue. Fail-closed.
 */
import { globSync, lstatSync, readFileSync } from 'node:fs';
import {
    basename,
    dirname,
    isAbsolute,
    join,
    relative,
    resolve,
    sep,
} from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateJsonSchema } from './generator-platform/validate-ir.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const RECIPES_GLOB = 'conventions/libraries/*/*.setup.json';
const RECIPE_SCHEMA_PATH = 'conventions/libraries/library-setup.schema.json';
const APP_MANIFEST_SCHEMA_PATH =
    'conventions/libraries/app-library-manifest.schema.json';
const APPS_GLOB = 'apps/*';
const DEP_FIELDS = [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
];
const PLATFORM_EXECUTOR_PREFIXES = {
    angular: [
        '@angular/build:',
        '@angular-devkit/build-angular:',
        '@nx/angular:',
    ],
    react: [
        '@nx/react:',
        '@nx/next:',
        '@nx/remix:',
        '@nx/rspack:',
        '@nx/vite:',
    ],
};

// ─── chemins sûrs ────────────────────────────────────────────────────────

/**
 * Résout `relPath` sous `baseAbs` et vérifie CHAQUE segment : existe, n'est pas
 * un lien symbolique, et le dernier est du type attendu.
 * @param {'file' | 'dir'} kind
 * @returns {{ real: string } | { missing: true } | { error: string }}
 */
function resolveReal(baseAbs, relPath, kind) {
    const base = resolve(baseAbs);
    const target = resolve(base, relPath);
    const within = relative(base, target);
    if (
        within === '' ||
        within === '..' ||
        within.startsWith(`..${sep}`) ||
        isAbsolute(within)
    ) {
        return { error: `${relPath} échappe la racine (interdit)` };
    }
    const segments = within.split(sep);
    let current = base;
    for (let index = 0; index < segments.length; index += 1) {
        current = join(current, segments[index]);
        let stats;
        try {
            stats = lstatSync(current);
        } catch (error) {
            if (error.code === 'ENOENT') return { missing: true };
            return {
                error: `${within} inaccessible ("${segments[index]}" : ${error.code})`,
            };
        }
        if (stats.isSymbolicLink()) {
            return {
                error: `${within} : "${segments[index]}" est un lien symbolique (interdit)`,
            };
        }
        const last = index === segments.length - 1;
        if (last) {
            if (kind === 'file' && !stats.isFile()) {
                return { error: `${within} n'est pas un fichier régulier` };
            }
            if (kind === 'dir' && !stats.isDirectory()) {
                return { error: `${within} n'est pas un dossier` };
            }
        } else if (!stats.isDirectory()) {
            return {
                error: `${within} : "${segments[index]}" n'est pas un dossier`,
            };
        }
    }
    return { real: current };
}

function readTextUnder(rootAbs, relPath) {
    const resolved = resolveReal(rootAbs, relPath, 'file');
    if (resolved.error) throw new Error(resolved.error);
    if (resolved.missing) throw new Error(`${relPath} introuvable`);
    return readFileSync(resolved.real, 'utf8');
}

function readJsonUnder(rootAbs, relPath) {
    return JSON.parse(readTextUnder(rootAbs, relPath));
}

/** bun.lock est du JSONC (virgules traînantes) — parse tolérant, fichier machine. */
function parseJsonc(raw) {
    return JSON.parse(raw.replace(/,(\s*[}\]])/g, '$1'));
}

/** @returns {null | string} null = invariant satisfait ; string = raison de l'échec. */
function runAssertion(rootAbs, appRelativeDir, assertion) {
    const resolved = resolveReal(
        rootAbs,
        `${appRelativeDir}/${assertion.file}`,
        'file'
    );
    if (resolved.error) return resolved.error;
    if (resolved.missing) return `${assertion.file} absent`;
    const content = readFileSync(resolved.real, 'utf8');
    if (assertion.kind === 'file-exists') return null;
    if (assertion.kind === 'file-contains') {
        return content.includes(assertion.value)
            ? null
            : `${assertion.file} ne contient pas "${assertion.value}"`;
    }
    if (assertion.kind === 'file-matches') {
        return new RegExp(assertion.value).test(content)
            ? null
            : `${assertion.file} ne matche pas /${assertion.value}/`;
    }
    return `kind d'assertion inconnu : ${assertion.kind}`;
}

function invariantsOf(recipe) {
    const blocks = recipe.coexistence ?? [];
    return {
        static: [
            ...(recipe.static_invariants ?? []),
            ...blocks.flatMap((block) => block.static_invariants ?? []),
        ],
        runtime: [
            ...(recipe.runtime_acceptance ?? []),
            ...blocks.flatMap((block) => block.runtime_acceptance ?? []),
        ],
    };
}

// ─── recettes ───────────────────────────────────────────────────────────

/** Recettes : lecture confinée + schéma fermé + cohérence hors JSON Schema. */
export function validateRecipes(rootAbs = ROOT) {
    const root = resolve(rootAbs);
    const errors = [];
    let schema;
    try {
        schema = readJsonUnder(root, RECIPE_SCHEMA_PATH);
    } catch (error) {
        return {
            ok: false,
            recipes: new Map(),
            errors: [`${RECIPE_SCHEMA_PATH} : ${error.message}`],
        };
    }

    const files = globSync(RECIPES_GLOB, { cwd: root }).sort();
    if (files.length === 0) errors.push(`aucune recette (${RECIPES_GLOB})`);

    const recipes = new Map(); // clé : `${platform}/${library}`
    for (const relativePath of files) {
        const resolved = resolveReal(root, relativePath, 'file');
        if (resolved.error) {
            errors.push(resolved.error);
            continue;
        }
        if (resolved.missing) continue;

        let recipe;
        try {
            recipe = JSON.parse(readFileSync(resolved.real, 'utf8'));
        } catch (error) {
            errors.push(`${relativePath}: JSON invalide (${error.message})`);
            continue;
        }

        for (const violation of validateJsonSchema(recipe, schema)) {
            errors.push(`${relativePath} ${violation}`);
        }

        const dirPlatform = basename(dirname(relativePath));
        const stem = basename(relativePath, '.setup.json');
        if (recipe.platform !== dirPlatform) {
            errors.push(
                `${relativePath}: platform "${recipe.platform}" ≠ dossier "${dirPlatform}"`
            );
        }
        if (recipe.library !== stem) {
            errors.push(
                `${relativePath}: library "${recipe.library}" ≠ nom de fichier "${stem}"`
            );
        }

        if (
            typeof recipe.platform === 'string' &&
            typeof recipe.library === 'string'
        ) {
            const key = `${recipe.platform}/${recipe.library}`;
            if (recipes.has(key)) {
                errors.push(
                    `${relativePath}: (${key}) déjà défini par une autre recette`
                );
            } else {
                recipes.set(key, recipe);
            }
        }

        validateRecipeCoherence(recipe, relativePath, root, errors);
    }

    for (const [key, recipe] of recipes) {
        for (const [index, block] of (recipe.coexistence ?? []).entries()) {
            if (block?.with === recipe.library) {
                errors.push(`${key}: coexistence avec elle-même`);
            } else if (
                block?.with &&
                !recipes.has(`${recipe.platform}/${block.with}`)
            ) {
                errors.push(
                    `${key}: coexistence[${index}].with "${block.with}" n'a pas de recette pour ${recipe.platform}`
                );
            }
        }
    }

    return { ok: errors.length === 0, recipes, errors };
}

function validateRecipeCoherence(recipe, relativePath, root, errors) {
    const { static: statics, runtime } = invariantsOf(recipe);

    const footprints = (recipe.static_invariants ?? []).filter(
        (invariant) => invariant?.footprint === true
    );
    if (footprints.length !== 1) {
        errors.push(
            `${relativePath}: exactement un static_invariant doit porter "footprint": true (${footprints.length})`
        );
    }
    for (const footprint of footprints) {
        if (
            !['file-contains', 'file-matches'].includes(footprint.assert?.kind)
        ) {
            errors.push(
                `${relativePath}: l'empreinte "${footprint.id}" doit être file-contains ou file-matches (positive)`
            );
        }
    }

    const seenIds = new Set();
    for (const invariant of [...statics, ...runtime]) {
        if (!invariant || typeof invariant.id !== 'string') continue;
        if (seenIds.has(invariant.id)) {
            errors.push(
                `${relativePath}: id d'invariant dupliqué "${invariant.id}"`
            );
        }
        seenIds.add(invariant.id);
    }

    for (const invariant of statics) {
        if (invariant?.assert?.kind === 'file-matches') {
            try {
                new RegExp(invariant.assert.value);
            } catch {
                errors.push(
                    `${relativePath}: regex invalide dans "${invariant.id}"`
                );
            }
        }
    }

    for (const acceptance of runtime) {
        if (acceptance?.status === 'enforced') {
            errors.push(
                `${relativePath}: runtime_acceptance "${acceptance.id}" est "enforced" mais aucun harnais n'exécute les preuves (lot C non livré)`
            );
        }
    }

    if (recipe.install?.method === 'official-schematic') {
        const argv = recipe.install.command?.argv ?? [];
        const tokens = argv.filter((element) => element === '{{app}}').length;
        if (tokens !== 1) {
            errors.push(
                `${relativePath}: la commande official-schematic doit contenir exactement un argument "{{app}}" (${tokens})`
            );
        }
    }

    if (
        recipe.install?.method === 'reference-derived' &&
        typeof recipe.install.reference_tool === 'string'
    ) {
        const guard = resolveReal(root, recipe.install.reference_tool, 'file');
        if (guard.error) {
            errors.push(`${relativePath}: reference_tool ${guard.error}`);
        } else if (guard.missing) {
            errors.push(
                `${relativePath}: reference_tool "${recipe.install.reference_tool}" introuvable`
            );
        }
    }
}

// ─── plateforme & dépendances ───────────────────────────────────────────

/** Plateforme d'un projet Nx, déduite de ses exécuteurs de targets. */
export function detectAppPlatform(appAbsRoot) {
    let project;
    try {
        project = JSON.parse(
            readFileSync(join(appAbsRoot, 'project.json'), 'utf8')
        );
    } catch {
        return null;
    }
    const executors = Object.values(project.targets ?? {}).map(
        (target) => target?.executor ?? ''
    );
    for (const [platform, prefixes] of Object.entries(
        PLATFORM_EXECUTOR_PREFIXES
    )) {
        if (
            executors.some((executor) =>
                prefixes.some((prefix) => executor.startsWith(prefix))
            )
        ) {
            return platform;
        }
    }
    return 'unknown';
}

/**
 * Une dépendance doit être : déclarée dans package.json racine ; si `catalog:`,
 * présente au catalog correspondant ; verrouillée dans bun.lock avec un spec
 * IDENTIQUE à celui de package.json et une version résolue égale à celle du
 * catalog.
 */
export function verifyWorkspaceDependency(rootAbs, packageName) {
    const root = resolve(rootAbs);
    const errors = [];
    let pkg;
    try {
        pkg = readJsonUnder(root, 'package.json');
    } catch (error) {
        return [`package.json racine : ${error.message}`];
    }

    let spec;
    for (const field of DEP_FIELDS) {
        if (pkg[field] && Object.hasOwn(pkg[field], packageName)) {
            spec = pkg[field][packageName];
            break;
        }
    }
    if (spec === undefined) {
        return [`${packageName} absent des dépendances de package.json racine`];
    }

    let catalogVersion;
    if (typeof spec === 'string' && spec.startsWith('catalog:')) {
        const catalogName = spec.slice('catalog:'.length);
        const catalog = catalogName
            ? pkg.workspaces?.catalogs?.[catalogName]
            : pkg.workspaces?.catalog;
        if (!catalog || !Object.hasOwn(catalog, packageName)) {
            errors.push(
                `${packageName} référence "${spec}" mais absent du catalog correspondant`
            );
        } else {
            catalogVersion = catalog[packageName];
        }
    }

    let lock;
    try {
        lock = parseJsonc(readTextUnder(root, 'bun.lock'));
    } catch (error) {
        return [...errors, `bun.lock : ${error.message}`];
    }
    const lockRoot = lock.workspaces?.[''] ?? {};
    let lockSpec;
    for (const field of DEP_FIELDS) {
        if (lockRoot[field] && Object.hasOwn(lockRoot[field], packageName)) {
            lockSpec = lockRoot[field][packageName];
            break;
        }
    }
    if (lockSpec === undefined) {
        errors.push(`${packageName} absent du manifeste de bun.lock`);
    } else if (lockSpec !== spec) {
        errors.push(
            `${packageName} : spec "${spec}" (package.json) ≠ "${lockSpec}" (bun.lock)`
        );
    }

    const locked = lock.packages?.[packageName];
    if (!locked) {
        errors.push(`${packageName} non résolu dans bun.lock (packages)`);
    } else if (typeof catalogVersion === 'string') {
        const identifier = Array.isArray(locked)
            ? String(locked[0])
            : String(locked);
        const at = identifier.lastIndexOf('@');
        const resolvedVersion = at > 0 ? identifier.slice(at + 1) : '';
        if (resolvedVersion && resolvedVersion !== catalogVersion) {
            errors.push(
                `${packageName} : catalog "${catalogVersion}" ≠ version résolue "${resolvedVersion}" (bun.lock)`
            );
        }
    }
    return errors;
}

// ─── apps ───────────────────────────────────────────────────────────────

/** Apps : manifeste obligatoire, plateforme déterminée, invariants réels. */
export function verifyApps(rootAbs = ROOT, recipes) {
    const root = resolve(rootAbs);
    const errors = [];
    let manifestSchema;
    try {
        manifestSchema = readJsonUnder(root, APP_MANIFEST_SCHEMA_PATH);
    } catch (error) {
        return {
            ok: false,
            checkedApps: 0,
            errors: [`${APP_MANIFEST_SCHEMA_PATH} : ${error.message}`],
        };
    }

    let checkedApps = 0;
    for (const appRelative of globSync(APPS_GLOB, { cwd: root }).sort()) {
        const appName = basename(appRelative);

        const dirGuard = resolveReal(root, appRelative, 'dir');
        if (dirGuard.missing) continue;
        if (dirGuard.error) {
            // Un fichier isolé dans apps/ n'est pas une app ; un lien l'est encore moins.
            if (/lien symbolique/.test(dirGuard.error)) {
                errors.push(dirGuard.error);
            }
            continue;
        }

        const projectGuard = resolveReal(
            root,
            `${appRelative}/project.json`,
            'file'
        );
        if (projectGuard.missing) continue; // pas un projet Nx
        if (projectGuard.error) {
            errors.push(projectGuard.error);
            continue;
        }

        const manifestRelative = `${appRelative}/.cmz/libraries.json`;
        const manifestGuard = resolveReal(
            root,
            `${appRelative}/.cmz/libraries.json`,
            'file'
        );
        if (manifestGuard.error) {
            errors.push(manifestGuard.error);
            continue;
        }
        if (manifestGuard.missing) {
            errors.push(
                `${appName} a un project.json régulier mais pas de ${manifestRelative} — toute app gérée doit déclarer ses bibliothèques (ADR-0041)`
            );
            continue;
        }
        checkedApps += 1;

        let manifest;
        try {
            manifest = JSON.parse(readFileSync(manifestGuard.real, 'utf8'));
        } catch (error) {
            errors.push(
                `${manifestRelative}: JSON invalide (${error.message})`
            );
            continue;
        }
        const schemaErrors = validateJsonSchema(manifest, manifestSchema);
        if (schemaErrors.length > 0) {
            for (const violation of schemaErrors) {
                errors.push(`${manifestRelative} ${violation}`);
            }
            continue;
        }

        const detected = detectAppPlatform(join(root, appRelative));
        if (!detected || detected === 'unknown') {
            errors.push(
                `${manifestRelative}: plateforme Nx indéterminée pour apps/${appName} — une app gérée doit être identifiable (exécuteur @angular/* ou @nx/react…)`
            );
            continue;
        }
        if (manifest.platform !== detected) {
            errors.push(
                `${manifestRelative}: platform "${manifest.platform}" ≠ plateforme Nx détectée "${detected}"`
            );
            continue;
        }

        verifyAppManifest(root, appRelative, manifest, recipes, errors);
    }

    return { ok: errors.length === 0, checkedApps, errors };
}

function verifyAppManifest(root, appRelative, manifest, recipes, errors) {
    const manifestRelative = `${appRelative}/.cmz/libraries.json`;
    const declared = new Set(manifest.libraries);

    for (const libraryId of manifest.libraries) {
        const recipe = recipes.get(`${manifest.platform}/${libraryId}`);
        if (!recipe) {
            errors.push(
                `${manifestRelative}: "${libraryId}" n'a pas de recette pour ${manifest.platform}`
            );
            continue;
        }
        for (const packageName of recipe.packages ?? []) {
            for (const failure of verifyWorkspaceDependency(
                root,
                packageName
            )) {
                errors.push(`${manifestRelative} [${libraryId}] ${failure}`);
            }
        }
        for (const invariant of recipe.static_invariants ?? []) {
            const failure = runAssertion(root, appRelative, invariant.assert);
            if (failure) {
                errors.push(
                    `${manifestRelative} [${libraryId}/${invariant.id}] ${failure}`
                );
            }
        }
        for (const block of recipe.coexistence ?? []) {
            if (!declared.has(block.with)) continue;
            for (const invariant of block.static_invariants) {
                const failure = runAssertion(
                    root,
                    appRelative,
                    invariant.assert
                );
                if (failure) {
                    errors.push(
                        `${manifestRelative} [${libraryId}+${block.with}/${invariant.id}] ${failure}`
                    );
                }
            }
        }
    }

    for (const [key, recipe] of recipes) {
        if (!key.startsWith(`${manifest.platform}/`)) continue;
        if (declared.has(recipe.library)) continue;
        const footprint = (recipe.static_invariants ?? []).find(
            (invariant) => invariant.footprint === true
        );
        if (!footprint) continue;
        const result = runAssertion(root, appRelative, footprint.assert);
        if (result === null) {
            errors.push(
                `${manifestRelative}: empreinte de "${recipe.library}" présente (${footprint.id}) mais absente de libraries[]`
            );
        } else if (
            /lien symbolique|n'est pas un fichier régulier/.test(result)
        ) {
            // Un chemin d'empreinte falsifié ne doit pas masquer l'usage.
            errors.push(
                `${manifestRelative} [${recipe.library}/${footprint.id}] ${result}`
            );
        }
    }
}

// ─── point d'entrée ─────────────────────────────────────────────────────

function main() {
    const recipeResult = validateRecipes();
    let appResult = { ok: true, checkedApps: 0, errors: [] };
    if (recipeResult.ok) {
        try {
            appResult = verifyApps(ROOT, recipeResult.recipes);
        } catch (error) {
            appResult = {
                ok: false,
                checkedApps: 0,
                errors: [`vérification des apps : ${error.message}`],
            };
        }
    }

    const errors = [...recipeResult.errors, ...appResult.errors];
    if (errors.length > 0) {
        console.error('❌  check:library-setup');
        for (const error of errors) console.error(`   ${error}`);
        process.exitCode = 1;
        return;
    }

    const runtimeDeclared = [...recipeResult.recipes.values()].reduce(
        (total, recipe) => total + invariantsOf(recipe).runtime.length,
        0
    );
    console.log(
        `✔ check:library-setup — ${recipeResult.recipes.size} recette(s) (platform/library), ` +
            `${appResult.checkedApps} app(s) vérifiée(s), ` +
            `${runtimeDeclared} runtime_acceptance déclaré(s) sans harnais (lot C).`
    );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main();
}
