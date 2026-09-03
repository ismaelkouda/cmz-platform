#!/usr/bin/env node
/**
 * check:library-setup — garde-fou de la configuration des bibliothèques
 * gouvernées (`conventions/libraries/*.setup.json`), ADR-0041.
 *
 * Deux niveaux, volontairement distincts :
 *
 *   - `static_invariants` : présence structurelle, vérifiée en lisant des
 *     fichiers de l'app. Ce sont des garde-fous de DÉRIVE, pas des preuves de
 *     fonctionnement — un `@import 'tailwindcss'` peut exister sans que le CSS
 *     compile. Contrôlés ici, à chaque run.
 *   - `runtime_acceptance` : les preuves réelles (un composant compile, une
 *     classe utilitaire produit sa règle CSS, coexistence navigateur). Elles
 *     exigent un harnais de build/navigateur encore à livrer (plan B/C). Tant
 *     que `status` vaut `harness-pending`, cette gate les LISTE sans les
 *     exécuter et n'en tire aucune garantie.
 *
 * Vérifications supplémentaires (défauts P0 corrigés) :
 *   - schéma JSON fermé pour les recettes ET pour `apps/<app>/.cmz/libraries.json` ;
 *   - identifiants de bibliothèque uniques entre recettes ;
 *   - plateforme de la recette == plateforme du projet Nx == plateforme du manifeste ;
 *   - dépendances vérifiées structurellement (package.json racine + catalog + bun.lock),
 *     jamais par sous-chaîne ;
 *   - chaque chemin inspecté : confiné à la racine de l'app, aucun segment
 *     lien symbolique ou fichier spécial ;
 *   - `reference_tool` confiné au dépôt, existant, fichier régulier ;
 *   - toute app avec un `project.json` DOIT déclarer `.cmz/libraries.json` ;
 *   - une bibliothèque gouvernée utilisée (empreinte) mais non déclarée = échec.
 *
 * Fail-closed.
 */
import { existsSync, globSync, lstatSync, readFileSync } from 'node:fs';
import { basename, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateJsonSchema } from './generator-platform/validate-ir.mjs';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const RECIPES_GLOB = 'conventions/libraries/*.setup.json';
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
const ANGULAR_EXECUTOR_PREFIXES = [
    '@angular/build:',
    '@angular-devkit/build-angular:',
    '@nx/angular:',
];
const REACT_EXECUTOR_PREFIXES = ['@nx/react:', '@nx/next:', '@nx/remix:'];

function readJson(root, relativePath) {
    return JSON.parse(readFileSync(join(root, relativePath), 'utf8'));
}

/** bun.lock est du JSONC (virgules traînantes) — parse tolérant, fichier machine. */
function parseJsonc(raw) {
    return JSON.parse(raw.replace(/,(\s*[}\]])/g, '$1'));
}

/**
 * Résout `relativePath` sous `baseAbs` et refuse : l'évasion hors de base, tout
 * segment lien symbolique, un fichier final non régulier, un segment
 * intermédiaire non dossier.
 * @returns {{ path: string } | { path: string, missing: true } | { error: string }}
 */
function safeResolveWithin(baseAbs, relativePath) {
    const base = resolve(baseAbs);
    const target = resolve(base, relativePath);
    const within = relative(base, target);
    if (
        within === '' ||
        within === '..' ||
        within.startsWith(`..${sep}`) ||
        isAbsolute(within)
    ) {
        return { error: `${relativePath} échappe la racine (interdit)` };
    }
    const segments = within.split(sep);
    let current = base;
    for (let index = 0; index < segments.length; index += 1) {
        current = join(current, segments[index]);
        let stats;
        try {
            stats = lstatSync(current);
        } catch (error) {
            if (error.code === 'ENOENT') return { path: target, missing: true };
            return { error: `${relativePath} illisible (${error.code})` };
        }
        if (stats.isSymbolicLink()) {
            return {
                error: `${relativePath} : "${segments[index]}" est un lien symbolique (interdit)`,
            };
        }
        const last = index === segments.length - 1;
        if (last && !stats.isFile()) {
            return { error: `${relativePath} n'est pas un fichier régulier` };
        }
        if (!last && !stats.isDirectory()) {
            return {
                error: `${relativePath} : "${segments[index]}" n'est pas un dossier`,
            };
        }
    }
    return { path: target };
}

/**
 * @returns {null | string} null = invariant satisfait ; string = raison de l'échec.
 *
 * Il n'existe volontairement pas de `file-not-contains` : « absence d'une
 * chaîne » n'est pas un invariant structurel fiable (une note de migration en
 * commentaire — « TranslationPort retiré » — le déclenche à tort). La garantie
 * « l'anti-pattern est absent » appartient à runtime_acceptance : la
 * compilation prouve quels symboles sont réellement référencés.
 */
function runAssertion(appAbsRoot, assertion) {
    const guard = safeResolveWithin(appAbsRoot, assertion.file);
    if (guard.error) return guard.error;
    if (guard.missing) return `${assertion.file} absent`;
    if (assertion.kind === 'file-exists') return null;
    const content = readFileSync(guard.path, 'utf8');
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
    const coexistenceStatic = (recipe.coexistence ?? []).flatMap(
        (block) => block.static_invariants ?? []
    );
    const coexistenceRuntime = (recipe.coexistence ?? []).flatMap(
        (block) => block.runtime_acceptance ?? []
    );
    return {
        static: [...(recipe.static_invariants ?? []), ...coexistenceStatic],
        runtime: [...(recipe.runtime_acceptance ?? []), ...coexistenceRuntime],
    };
}

/** Recettes : schéma fermé + cohérence inter-champs hors JSON Schema. */
export function validateRecipes(root = ROOT) {
    const errors = [];
    let schema;
    try {
        schema = readJson(root, RECIPE_SCHEMA_PATH);
    } catch (error) {
        return {
            ok: false,
            recipes: new Map(),
            errors: [`${RECIPE_SCHEMA_PATH} illisible : ${error.message}`],
        };
    }

    const files = globSync(RECIPES_GLOB, { cwd: root }).sort();
    if (files.length === 0) errors.push(`aucune recette (${RECIPES_GLOB})`);

    const recipes = new Map();
    for (const relativePath of files) {
        let recipe;
        try {
            recipe = readJson(root, relativePath);
        } catch (error) {
            errors.push(`${relativePath}: JSON invalide (${error.message})`);
            continue;
        }

        for (const violation of validateJsonSchema(recipe, schema)) {
            errors.push(`${relativePath} ${violation}`);
        }

        const stem = basename(relativePath, '.setup.json');
        if (recipe.library !== stem) {
            errors.push(
                `${relativePath}: library "${recipe.library}" ≠ nom de fichier "${stem}"`
            );
        }
        if (typeof recipe.library === 'string') {
            if (recipes.has(recipe.library)) {
                errors.push(
                    `${relativePath}: identifiant "${recipe.library}" déjà défini par une autre recette`
                );
            } else {
                recipes.set(recipe.library, recipe);
            }
        }

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
                !['file-contains', 'file-matches'].includes(
                    footprint.assert?.kind
                )
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
                    `${relativePath}: runtime_acceptance "${acceptance.id}" est "enforced" mais aucun harnais n'exécute les preuves (plan B/C non livré)`
                );
            }
        }

        // Le pattern + le oneOf du schéma valident déjà la forme ; ici on ne
        // fait que la vérification filesystem, et seulement si la valeur est là.
        if (
            recipe.install?.method === 'reference-derived' &&
            typeof recipe.install.reference_tool === 'string'
        ) {
            const referenceTool = recipe.install.reference_tool;
            const guard = safeResolveWithin(root, referenceTool);
            if (guard.error) {
                errors.push(`${relativePath}: reference_tool ${guard.error}`);
            } else if (guard.missing) {
                errors.push(
                    `${relativePath}: reference_tool "${referenceTool}" introuvable`
                );
            }
        }
    }

    for (const [name, recipe] of recipes) {
        for (const [index, block] of (recipe.coexistence ?? []).entries()) {
            if (block?.with && !recipes.has(block.with)) {
                errors.push(
                    `${name}: coexistence[${index}].with "${block.with}" n'a pas de recette`
                );
            }
            if (block?.with === name) {
                errors.push(`${name}: coexistence avec elle-même`);
            }
        }
    }

    return { ok: errors.length === 0, recipes, errors };
}

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
    if (
        executors.some((executor) =>
            ANGULAR_EXECUTOR_PREFIXES.some((prefix) =>
                executor.startsWith(prefix)
            )
        )
    ) {
        return 'angular';
    }
    if (
        executors.some((executor) =>
            REACT_EXECUTOR_PREFIXES.some((prefix) =>
                executor.startsWith(prefix)
            )
        )
    ) {
        return 'react';
    }
    return 'unknown';
}

/** Une dépendance doit être déclarée dans package.json racine, résolue au
 *  catalog si elle utilise le protocole, et verrouillée dans bun.lock. */
export function verifyWorkspaceDependency(root, packageName) {
    const errors = [];
    let pkg;
    try {
        pkg = readJson(root, 'package.json');
    } catch (error) {
        return [`package.json racine illisible : ${error.message}`];
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

    if (typeof spec === 'string' && spec.startsWith('catalog:')) {
        const catalogName = spec.slice('catalog:'.length);
        const catalog = catalogName
            ? pkg.workspaces?.catalogs?.[catalogName]
            : pkg.workspaces?.catalog;
        if (!catalog || !Object.hasOwn(catalog, packageName)) {
            errors.push(
                `${packageName} référence "${spec}" mais absent du catalog correspondant`
            );
        }
    }

    let lock;
    try {
        lock = parseJsonc(readFileSync(join(root, 'bun.lock'), 'utf8'));
    } catch (error) {
        return [...errors, `bun.lock illisible : ${error.message}`];
    }
    const lockRoot = lock.workspaces?.[''] ?? {};
    const inLockManifest = DEP_FIELDS.some(
        (field) =>
            lockRoot[field] && Object.hasOwn(lockRoot[field], packageName)
    );
    const inLockPackages = Boolean(
        lock.packages && Object.hasOwn(lock.packages, packageName)
    );
    if (!inLockManifest || !inLockPackages) {
        errors.push(`${packageName} non verrouillé dans bun.lock`);
    }
    return errors;
}

/** Apps : manifeste obligatoire, cohérence de plateforme, invariants réels. */
export function verifyApps(root = ROOT, recipes) {
    const errors = [];
    let manifestSchema;
    try {
        manifestSchema = readJson(root, APP_MANIFEST_SCHEMA_PATH);
    } catch (error) {
        return {
            ok: false,
            checkedApps: 0,
            errors: [
                `${APP_MANIFEST_SCHEMA_PATH} illisible : ${error.message}`,
            ],
        };
    }

    const appDirs = globSync(APPS_GLOB, { cwd: root })
        .filter((dir) => existsSync(join(root, dir, 'project.json')))
        .sort();

    let checkedApps = 0;
    for (const appRelative of appDirs) {
        const appAbs = join(root, appRelative);
        const appName = basename(appRelative);
        const manifestRelative = `${appRelative}/.cmz/libraries.json`;
        const detectedPlatform = detectAppPlatform(appAbs);

        const guard = safeResolveWithin(appAbs, '.cmz/libraries.json');
        if (guard.error) {
            errors.push(`${manifestRelative}: ${guard.error}`);
            continue;
        }
        if (guard.missing) {
            errors.push(
                `${appName} a un project.json mais pas de ${manifestRelative} — toute app gérée doit déclarer ses bibliothèques (ADR-0041)`
            );
            continue;
        }
        checkedApps += 1;

        let manifest;
        try {
            manifest = JSON.parse(readFileSync(guard.path, 'utf8'));
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

        if (
            detectedPlatform &&
            detectedPlatform !== 'unknown' &&
            manifest.platform !== detectedPlatform
        ) {
            errors.push(
                `${manifestRelative}: platform "${manifest.platform}" ≠ plateforme Nx détectée "${detectedPlatform}"`
            );
        }

        const declared = new Set(manifest.libraries);

        for (const libraryId of manifest.libraries) {
            const recipe = recipes.get(libraryId);
            if (!recipe) {
                errors.push(
                    `${manifestRelative}: "${libraryId}" n'a pas de recette`
                );
                continue;
            }
            if (recipe.platform !== manifest.platform) {
                errors.push(
                    `${manifestRelative} [${libraryId}]: recette platform "${recipe.platform}" ≠ manifeste "${manifest.platform}"`
                );
            }
            for (const packageName of recipe.packages) {
                for (const failure of verifyWorkspaceDependency(
                    root,
                    packageName
                )) {
                    errors.push(
                        `${manifestRelative} [${libraryId}] ${failure}`
                    );
                }
            }
            for (const invariant of recipe.static_invariants) {
                const failure = runAssertion(appAbs, invariant.assert);
                if (failure) {
                    errors.push(
                        `${manifestRelative} [${libraryId}/${invariant.id}] ${failure}`
                    );
                }
            }
            for (const block of recipe.coexistence ?? []) {
                if (!declared.has(block.with)) continue;
                for (const invariant of block.static_invariants) {
                    const failure = runAssertion(appAbs, invariant.assert);
                    if (failure) {
                        errors.push(
                            `${manifestRelative} [${libraryId}+${block.with}/${invariant.id}] ${failure}`
                        );
                    }
                }
            }
        }

        for (const [libraryId, recipe] of recipes) {
            if (declared.has(libraryId)) continue;
            if (recipe.platform !== manifest.platform) continue;
            const footprint = recipe.static_invariants.find(
                (invariant) => invariant.footprint === true
            );
            if (!footprint) continue;
            if (runAssertion(appAbs, footprint.assert) === null) {
                errors.push(
                    `${manifestRelative}: empreinte de "${libraryId}" présente (${footprint.id}) mais absente de libraries[]`
                );
            }
        }
    }

    return { ok: errors.length === 0, checkedApps, errors };
}

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
        `✔ check:library-setup — ${recipeResult.recipes.size} recette(s), ` +
            `${appResult.checkedApps} app(s) vérifiée(s), ` +
            `${runtimeDeclared} runtime_acceptance déclaré(s) sans harnais (plan B/C).`
    );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main();
}
