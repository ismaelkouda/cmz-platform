#!/usr/bin/env node
/**
 * check:library-setup — vérifie les recettes d'installation de bibliothèques
 * (`conventions/libraries/*.setup.json`) et, pour toute app qui déclare des
 * bibliothèques (`apps/<app>/.cmz/libraries.json`), que chaque invariant de
 * setup est réellement satisfait dans l'arbre de l'app.
 *
 * Principe (ADR-0041) : la recette fige les INVARIANTS (ce qu'un setup correct
 * doit contenir) et un test d'acceptation ; le COMMENT (commande de la version
 * N) est délégué au schematic officiel, à un script reference-derived ou à un
 * LLM borné. Cette gate est le point de vérité qui empêche la dérive de setup.
 *
 * Fail-closed. Aujourd'hui : 0 app ne déclare de bibliothèque, donc la gate
 * valide uniquement la cohérence des recettes — comme check:application-designs
 * avec 0 conception.
 */
import { existsSync, globSync, readFileSync } from 'node:fs';
import { basename, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateJsonSchema } from './generator-platform/validate-ir.mjs';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const RECIPES_GLOB = 'conventions/libraries/*.setup.json';
const SCHEMA_PATH = 'conventions/libraries/library-setup.schema.json';
const APP_MANIFEST_GLOB = 'apps/*/.cmz/libraries.json';

function readJson(root, relativePath) {
    return JSON.parse(readFileSync(join(root, relativePath), 'utf8'));
}

/** Recettes : schéma fermé + cohérence inter-champs que JSON Schema ne prouve pas. */
export function validateRecipes(root = ROOT) {
    const errors = [];
    let schema;
    try {
        schema = readJson(root, SCHEMA_PATH);
    } catch (error) {
        return {
            ok: false,
            recipes: new Map(),
            errors: [`${SCHEMA_PATH} illisible : ${error.message}`],
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
        assertInvariantList(
            recipe.invariants,
            `${relativePath} invariants`,
            errors
        );
        for (const [index, block] of (recipe.coexistence ?? []).entries()) {
            assertInvariantList(
                block?.invariants,
                `${relativePath} coexistence[${index}].invariants`,
                errors
            );
        }
        if (
            recipe.install?.method === 'official-schematic' &&
            !recipe.install.command
        ) {
            errors.push(
                `${relativePath}: method official-schematic exige "command"`
            );
        }
        if (
            recipe.install?.method === 'reference-derived' &&
            !recipe.install.reference_tool
        ) {
            errors.push(
                `${relativePath}: method reference-derived exige "reference_tool"`
            );
        }
        if (typeof recipe.library === 'string')
            recipes.set(recipe.library, recipe);
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

function assertInvariantList(invariants, path, errors) {
    const seen = new Set();
    for (const [index, invariant] of (invariants ?? []).entries()) {
        if (!invariant || typeof invariant !== 'object') continue;
        if (seen.has(invariant.id)) {
            errors.push(`${path}[${index}]: id dupliqué "${invariant.id}"`);
        }
        seen.add(invariant.id);
        const assertion = invariant.assert;
        if (!assertion || typeof assertion !== 'object') continue;
        if (assertion.kind !== 'file-exists' && !assertion.value) {
            errors.push(
                `${path}[${index}].assert: "value" requis pour ${assertion.kind}`
            );
        }
        if (
            assertion.kind === 'file-matches' &&
            typeof assertion.value === 'string'
        ) {
            try {
                new RegExp(assertion.value);
            } catch {
                errors.push(`${path}[${index}].assert.value: regex invalide`);
            }
        }
    }
}

function runAssertion(appRoot, assertion) {
    const base = resolve(appRoot);
    const target = resolve(base, assertion.file);
    const within = relative(base, target);
    if (
        within === '' ||
        within === '..' ||
        within.startsWith(`..${sep}`) ||
        isAbsolute(within)
    ) {
        return `${assertion.file} échappe la racine de l'app (interdit)`;
    }
    if (!existsSync(target)) {
        return assertion.kind === 'file-not-contains'
            ? null
            : `${assertion.file} absent`;
    }
    if (assertion.kind === 'file-exists') return null;
    const content = readFileSync(target, 'utf8');
    if (assertion.kind === 'file-contains') {
        return content.includes(assertion.value)
            ? null
            : `${assertion.file} ne contient pas "${assertion.value}"`;
    }
    if (assertion.kind === 'file-not-contains') {
        return content.includes(assertion.value)
            ? `${assertion.file} contient "${assertion.value}" (interdit)`
            : null;
    }
    if (assertion.kind === 'file-matches') {
        return new RegExp(assertion.value).test(content)
            ? null
            : `${assertion.file} ne matche pas /${assertion.value}/`;
    }
    return `kind d'assertion inconnu : ${assertion.kind}`;
}

/** Apps : chaque bibliothèque déclarée doit satisfaire ses invariants (+ coexistence). */
export function verifyAppLibraries(root = ROOT, recipes) {
    const errors = [];
    const files = globSync(APP_MANIFEST_GLOB, { cwd: root }).sort();
    for (const relativePath of files) {
        let manifest;
        try {
            manifest = readJson(root, relativePath);
        } catch (error) {
            errors.push(`${relativePath}: JSON invalide (${error.message})`);
            continue;
        }
        if (
            manifest.schema_version !== '1.0.0' ||
            manifest.kind !== 'app-library-manifest' ||
            !Array.isArray(manifest.libraries)
        ) {
            errors.push(
                `${relativePath}: forme invalide (kind app-library-manifest, libraries[])`
            );
            continue;
        }
        const appRoot = join(
            root,
            relativePath.replace('/.cmz/libraries.json', '')
        );
        const declared = new Set(manifest.libraries);
        for (const libraryId of manifest.libraries) {
            const recipe = recipes.get(libraryId);
            if (!recipe) {
                errors.push(
                    `${relativePath}: "${libraryId}" n'a pas de recette`
                );
                continue;
            }
            for (const invariant of recipe.invariants) {
                const failure = runAssertion(appRoot, invariant.assert);
                if (failure) {
                    errors.push(
                        `${relativePath} [${libraryId}/${invariant.id}] ${failure}`
                    );
                }
            }
            for (const block of recipe.coexistence ?? []) {
                if (!declared.has(block.with)) continue;
                for (const invariant of block.invariants) {
                    const failure = runAssertion(appRoot, invariant.assert);
                    if (failure) {
                        errors.push(
                            `${relativePath} [${libraryId}+${block.with}/${invariant.id}] ${failure}`
                        );
                    }
                }
            }
        }
    }
    return { ok: errors.length === 0, checkedApps: files.length, errors };
}

function main() {
    const recipeResult = validateRecipes();
    const appResult = recipeResult.ok
        ? verifyAppLibraries(ROOT, recipeResult.recipes)
        : { ok: true, checkedApps: 0, errors: [] };
    const errors = [...recipeResult.errors, ...appResult.errors];
    if (errors.length > 0) {
        console.error('❌  check:library-setup');
        for (const error of errors) console.error(`   ${error}`);
        process.exitCode = 1;
        return;
    }
    console.log(
        `✔ check:library-setup — ${recipeResult.recipes.size} recette(s) valide(s), ${appResult.checkedApps} app(s) vérifiée(s).`
    );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main();
}
