#!/usr/bin/env node
/**
 * check-bun-lock-catalog-integrity.mjs
 *
 * Garde-fou ADR-0005 (catalog Bun) contre une régression connue et non
 * corrigée en amont : l'updater Bun de Dependabot supprime les sections
 * `catalog`/`catalogs` de `bun.lock` à chaque mise à jour
 * (dependabot-core#12522, ouvert). `check:versions`
 * (`check-catalog-usage.mjs`) ne lit que `package.json` — il ne détecterait
 * jamais que `bun.lock` a perdu ces sections pendant que `package.json` les
 * déclare toujours.
 *
 * `bun.lock.catalog`/`catalogs` est un miroir exact de
 * `package.json.workspaces.catalog`/`catalogs` (même clés, mêmes versions
 * résolues) après tout `bun install` sain — ce script impose l'égalité
 * stricte entre les deux et fige les versions de format actuellement
 * produites par Bun 1.3.14. Une montée de format doit donc être revue avec
 * la montée de Bun, jamais acceptée silencieusement depuis un bot.
 *
 * Usage : bun run check:bun-lock-catalog-integrity
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    parseJsonc,
    parseWithoutDuplicateKeys,
} from './check-library-setup-deps.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGE_JSON_PATH = join(ROOT, 'package.json');
const BUN_LOCK_PATH = join(ROOT, 'bun.lock');
export const EXPECTED_LOCKFILE_VERSION = 1;
export const EXPECTED_CONFIG_VERSION = 1;
export const EXPECTED_PACKAGE_MANAGER = 'bun@1.3.14';

function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Comparaison stricte de deux objets `{ nom: version }`, sans dépendre de l'ordre des clés. */
export function diffCatalog(expected, actual, label) {
    if (!isPlainObject(expected)) {
        return [`package.json : \`${label}\` doit être un objet.`];
    }
    if (!isPlainObject(actual)) {
        return [`bun.lock : \`${label}\` absent ou non objet.`];
    }

    const diffs = [];
    const expectedKeys = new Set(Object.keys(expected));
    const actualKeys = new Set(Object.keys(actual));

    for (const key of expectedKeys) {
        if (!actualKeys.has(key)) {
            diffs.push(`${label} : "${key}" absent de bun.lock`);
        } else if (actual[key] !== expected[key]) {
            diffs.push(
                `${label} : "${key}" = "${actual[key]}" dans bun.lock, ` +
                    `"${expected[key]}" dans package.json`
            );
        }
    }
    for (const key of actualKeys) {
        if (!expectedKeys.has(key)) {
            diffs.push(
                `${label} : "${key}" présent dans bun.lock mais absent de package.json`
            );
        }
    }
    return diffs;
}

/** Comparaison des catalogs nommés (`workspaces.catalogs`), un niveau plus profond. */
export function diffNamedCatalogs(expected, actual) {
    if (!isPlainObject(expected)) {
        return ['package.json : `workspaces.catalogs` doit être un objet.'];
    }
    if (!isPlainObject(actual)) {
        return ['bun.lock : `catalogs` absent ou non objet.'];
    }

    const diffs = [];
    const expectedNames = new Set(Object.keys(expected));
    const actualNames = new Set(Object.keys(actual));

    for (const name of expectedNames) {
        if (!actualNames.has(name)) {
            diffs.push(`catalogs."${name}" absent de bun.lock`);
            continue;
        }
        diffs.push(
            ...diffCatalog(expected[name], actual[name], `catalogs."${name}"`)
        );
    }
    for (const name of actualNames) {
        if (!expectedNames.has(name)) {
            diffs.push(
                `catalogs."${name}" présent dans bun.lock mais absent de package.json`
            );
        }
    }
    return diffs;
}

export function checkCatalogIntegrity(packageJson, bunLock) {
    if (!isPlainObject(packageJson)) {
        return {
            ok: false,
            errors: ['package.json : racine absente ou non objet.'],
        };
    }
    if (!isPlainObject(bunLock)) {
        return {
            ok: false,
            errors: ['bun.lock : racine absente ou non objet.'],
        };
    }

    const workspaces = packageJson.workspaces;
    if (!isPlainObject(workspaces)) {
        return {
            ok: false,
            errors: [
                'package.json : aucun `workspaces.catalog` déclaré — la politique de version unique (ADR-0005) est inopérante.',
            ],
        };
    }
    const expectedCatalog = workspaces.catalog ?? {};
    const expectedCatalogs = workspaces.catalogs ?? {};
    if (
        !isPlainObject(expectedCatalog) ||
        Object.keys(expectedCatalog).length === 0
    ) {
        return {
            ok: false,
            errors: ['package.json : `workspaces.catalog` est vide.'],
        };
    }

    const errors = [];
    if (packageJson.packageManager !== EXPECTED_PACKAGE_MANAGER) {
        errors.push(
            `package.json : \`packageManager\` vaut ${JSON.stringify(packageJson.packageManager)}, ` +
                `attendu ${JSON.stringify(EXPECTED_PACKAGE_MANAGER)}. ` +
                'Toute montée de Bun doit revoir ensemble le format du lockfile et ce garde.'
        );
    }
    if (bunLock.lockfileVersion !== EXPECTED_LOCKFILE_VERSION) {
        errors.push(
            `bun.lock : \`lockfileVersion\` vaut ${JSON.stringify(bunLock.lockfileVersion)}, ` +
                `attendu ${EXPECTED_LOCKFILE_VERSION} (Bun 1.3.14).`
        );
    }
    if (bunLock.configVersion !== EXPECTED_CONFIG_VERSION) {
        errors.push(
            `bun.lock : \`configVersion\` vaut ${JSON.stringify(bunLock.configVersion)}, ` +
                `attendu ${EXPECTED_CONFIG_VERSION} (Bun 1.3.14).`
        );
    }

    errors.push(
        ...diffCatalog(expectedCatalog, bunLock.catalog ?? {}, 'catalog')
    );
    errors.push(...diffNamedCatalogs(expectedCatalogs, bunLock.catalogs ?? {}));

    return { ok: errors.length === 0, errors };
}

function main() {
    const packageJson = parseWithoutDuplicateKeys(
        readFileSync(PACKAGE_JSON_PATH, 'utf8'),
        'package.json'
    );
    const bunLock = parseJsonc(readFileSync(BUN_LOCK_PATH, 'utf8'), 'bun.lock');

    const { ok, errors } = checkCatalogIntegrity(packageJson, bunLock);

    if (ok) {
        console.log(
            `✔ bun.lock reflète exactement le catalog de package.json ` +
                `(${Object.keys(packageJson.workspaces.catalog).length} entrée(s) + ` +
                `${Object.keys(packageJson.workspaces.catalogs ?? {}).length} catalog(s) nommé(s)).`
        );
        return;
    }

    console.error(
        `\n✖ bun.lock a divergé du catalog déclaré dans package.json (${errors.length} écart(s)) :\n`
    );
    for (const e of errors) console.error(`  ${e}`);
    console.error(
        '\nRégression connue et non corrigée chez Dependabot pour ce cas exact ' +
            '(dependabot-core#12522 : catalog/catalogs supprimés par son updater Bun ; ' +
            '#13623/#15848 : métadonnées ou format réécrits par une version embarquée différente).\n' +
            'Ne jamais éditer bun.lock à la main — relancer `bun install` depuis un ' +
            'environnement Bun 1.3.14 propre et committer le résultat.'
    );
    process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
