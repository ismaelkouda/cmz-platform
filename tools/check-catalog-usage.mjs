#!/usr/bin/env node
/**
 * Vérifie la politique de version unique du socle (ADR-0005).
 *
 * Le catalog de bun garantit qu'une dépendance déclarée `catalog:` résout vers
 * la version centralisée à la racine. Il ne garantit en revanche pas qu'un
 * package *utilise* le catalog : rien n'empêche d'écrire `"@angular/core": "^20.0.0"`
 * en dur et de réintroduire une divergence de version.
 *
 * Ce script comble ce trou : toute dépendance présente au catalog doit être
 * déclarée `catalog:` (ou `catalog:<nom>`) par les packages qui l'utilisent.
 *
 * Usage : bun run check:versions
 * Sortie : code 1 si au moins une violation est détectée (utilisable en CI).
 */

import { readFileSync, existsSync } from 'node:fs';
import { readdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEPENDENCY_FIELDS = [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
];

function readJson(path) {
    return JSON.parse(readFileSync(path, 'utf8'));
}

/** Aplatit le catalog par défaut et les catalogs nommés en `nom -> catalogAttendu`. */
function buildCatalogIndex(rootPackage) {
    const workspaces = rootPackage.workspaces;
    if (Array.isArray(workspaces) || !workspaces) {
        return new Map();
    }

    const index = new Map();
    for (const name of Object.keys(workspaces.catalog ?? {})) {
        index.set(name, 'catalog:');
    }
    for (const [catalogName, entries] of Object.entries(
        workspaces.catalogs ?? {}
    )) {
        for (const name of Object.keys(entries)) {
            index.set(name, `catalog:${catalogName}`);
        }
    }
    return index;
}

/** Liste les package.json des packages, en résolvant les motifs `apps/*`. */
function findPackageManifests(rootPackage) {
    const workspaces = rootPackage.workspaces;
    const patterns = Array.isArray(workspaces)
        ? workspaces
        : (workspaces?.packages ?? []);

    const manifests = [];
    for (const pattern of patterns) {
        const base = join(ROOT, pattern.replace(/\/\*$/, ''));
        if (!existsSync(base)) continue;

        for (const entry of readdirSync(base, { withFileTypes: true })) {
            if (!entry.isDirectory()) continue;
            const manifest = join(base, entry.name, 'package.json');
            if (existsSync(manifest)) manifests.push(manifest);
        }
    }
    return manifests;
}

function main() {
    const rootPackage = readJson(join(ROOT, 'package.json'));
    const catalog = buildCatalogIndex(rootPackage);

    if (catalog.size === 0) {
        console.error(
            '✖ Aucun catalog déclaré à la racine. La politique de version unique est inopérante.'
        );
        process.exit(1);
    }

    const manifests = findPackageManifests(rootPackage);
    const violations = [];

    for (const manifestPath of manifests) {
        const manifest = readJson(manifestPath);
        for (const field of DEPENDENCY_FIELDS) {
            for (const [name, range] of Object.entries(manifest[field] ?? {})) {
                const expected = catalog.get(name);
                if (!expected) continue;
                if (range === expected) continue;

                violations.push({
                    package: manifest.name ?? relative(ROOT, manifestPath),
                    file: relative(ROOT, manifestPath),
                    field,
                    dependency: name,
                    found: range,
                    expected,
                });
            }
        }
    }

    console.log(
        `Politique de version unique — ${catalog.size} dépendance(s) au catalog, ${manifests.length} package(s) vérifié(s).`
    );

    if (violations.length === 0) {
        console.log('✔ Aucune violation.');
        return;
    }

    console.error(`\n✖ ${violations.length} violation(s) :\n`);
    for (const v of violations) {
        console.error(
            `  ${v.package} (${v.file})\n` +
                `    ${v.field}.${v.dependency} = "${v.found}"  →  attendu "${v.expected}"`
        );
    }
    console.error(
        '\nLes dépendances du socle doivent être déclarées via le catalog (ADR-0005).'
    );
    process.exit(1);
}

main();
