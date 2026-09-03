#!/usr/bin/env node
/**
 * Adaptateur monorepo SEOS (ADR-0011).
 *
 * Post-traite la sortie plate d'un générateur SEOS pour la transformer en
 * bibliothèques Nx par couche et par module :
 *   1. distribue les dossiers de couche dans `libs/<module>/<lib>/src/lib/…` ;
 *   2. réécrit les spécificateurs d'import (alias → `@cmz/*`) ;
 *   3. émet, par lib : `package.json` (workspace:* + catalog:), `project.json`
 *      (tags Nx), `src/index.ts` (barrel), `tsconfig.*`.
 *
 * On ne touche jamais aux générateurs (ADR-0011). Cet outil est spécifique à ce
 * monorepo : il encode nos choix structurels.
 *
 * Usage :
 *   node tools/seos-adapter/adapt.mjs <dossier-plat> <module> [--dry-run]
 *
 * Exemple :
 *   node tools/seos-adapter/adapt.mjs /tmp/gen/seos-reference administrative-infrastructure
 *
 * <dossier-plat> : sortie d'un générateur (contient domain/ application/ … et *.routes.ts).
 * <module>       : nom court du module → libs/<module>/… et @cmz/<module>-…
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname, relative, basename, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    SCOPE,
    LAYERS,
    ROOT_FILES_LAYER,
    classifySpecifier,
    packageName,
} from './mapping.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const [flatDir, moduleName] = args.filter((a) => !a.startsWith('--'));

if (!flatDir || !moduleName) {
    console.error(
        'Usage : node tools/seos-adapter/adapt.mjs <dossier-plat> <module> [--dry-run]'
    );
    process.exit(1);
}

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------
function listFiles(dir) {
    const out = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, entry.name);
        if (entry.isDirectory()) out.push(...listFiles(p));
        else out.push(p);
    }
    return out;
}

const IMPORT_RE =
    /(\bfrom\s*|(?:\bimport|\bexport)\s*|\bimport\s*\(\s*)(['"])([^'"]+)\2/g;

/**
 * Réécrit les imports d'un fichier, en tenant compte de la **couche du fichier
 * courant** et de son chemin dans la lib :
 *   - même module + même couche → import **relatif** (reste dans la lib) ;
 *   - même module + autre couche → barrel `@cmz/<m>-<couche>` ;
 *   - autre module → barrel `@cmz/<autre>-<couche>` ;
 *   - noyau @shared/@core → barrel `@cmz/shared-*` / `@cmz/core` ;
 *   - externe → inchangé.
 *
 * @param currentLayer  couche du fichier courant (clé de LAYERS)
 * @param currentSub    chemin du fichier dans la lib (ex. "commands-handlers/x/y.handler.ts")
 */
function rewriteSource(code, currentLayer, currentSub, onUnknown) {
    const currentDir = posix.dirname(currentSub);
    return code.replace(IMPORT_RE, (whole, kw, quote, spec) => {
        const c = classifySpecifier(spec);
        let next;
        switch (c.kind) {
            case 'external':
                return whole;
            case 'shared':
                next = `${SCOPE}/${c.lib}`;
                break;
            case 'core':
                next = `${SCOPE}/core`;
                break;
            case 'unknown-layer':
                onUnknown(spec);
                return whole;
            case 'internal': {
                if (c.module === moduleName && c.layer === currentLayer) {
                    // même lib → import relatif vers le fichier cible
                    let relPath = posix.relative(currentDir, c.tail);
                    if (!relPath.startsWith('.')) relPath = './' + relPath;
                    next = relPath;
                } else {
                    // autre couche (ou autre module) → barrel de la lib cible
                    next = packageName(c.module, c.layer);
                }
                break;
            }
            default:
                return whole;
        }
        return `${kw}${quote}${next}${quote}`;
    });
}

function write(path, content) {
    if (dryRun) return;
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
}

// ---------------------------------------------------------------------------
// 1 + 2. Distribution des fichiers + réécriture des imports
// ---------------------------------------------------------------------------
const allFiles = listFiles(flatDir);
const perLib = {}; // suffix -> [{destRel, code}]
const unknownLayers = new Set();
let moved = 0;

for (const abs of allFiles) {
    const rel = relative(flatDir, abs); // ex. "domain/entities/x/x.entity.ts"
    const topDir = rel.split('/')[0];

    // couche = dossier de 1er niveau ; fichiers racine (*.routes.ts) → feature
    let layerKey;
    let subPath;
    if (LAYERS[topDir]) {
        layerKey = topDir;
        subPath = rel.slice(topDir.length + 1); // sous la couche
    } else if (rel === basename(rel)) {
        layerKey = ROOT_FILES_LAYER; // fichier à la racine du module (routes)
        subPath = rel;
    } else {
        unknownLayers.add(topDir);
        continue;
    }

    const cfg = LAYERS[layerKey];
    const code = readFileSync(abs, 'utf8');
    const rewritten = abs.endsWith('.ts')
        ? rewriteSource(code, layerKey, subPath, (s) => unknownLayers.add(s))
        : code;

    (perLib[cfg.suffix] ??= []).push({ subPath, code: rewritten });
    moved += 1;
}

// ---------------------------------------------------------------------------
// 3. Émission des libs
// ---------------------------------------------------------------------------
const created = [];

for (const [, cfg] of Object.entries(LAYERS)) {
    const files = perLib[cfg.suffix];
    if (!files || files.length === 0) continue;

    const libRoot = join(ROOT, 'libs', moduleName, cfg.dir);
    const pkgName = `${SCOPE}/${moduleName}-${cfg.suffix}`;

    // fichiers de la couche
    for (const { subPath, code } of files) {
        write(join(libRoot, 'src', 'lib', subPath), code);
    }

    // barrel index.ts : réexporte tous les .ts de la lib
    const exports = files
        .filter(
            (f) => f.subPath.endsWith('.ts') && !f.subPath.endsWith('.spec.ts')
        )
        .map((f) => `export * from './lib/${f.subPath.replace(/\.ts$/, '')}';`)
        .sort()
        .join('\n');
    write(join(libRoot, 'src', 'index.ts'), exports + '\n');

    // dépendances internes (workspace:*) selon la couche
    const internalDeps = {};
    for (const dep of cfg.dependsOn) {
        internalDeps[`${SCOPE}/${moduleName}-${dep}`] = 'workspace:*';
    }

    // package.json
    write(
        join(libRoot, 'package.json'),
        JSON.stringify(
            {
                name: pkgName,
                version: '0.0.0',
                private: true,
                dependencies: {
                    ...internalDeps,
                    // dépendances de framework : au catalog (ADR-0005)
                    '@angular/core': 'catalog:',
                    rxjs: 'catalog:',
                },
            },
            null,
            2
        ) + '\n'
    );

    // project.json (tags Nx, ADR-0011 / frontières Phase 06)
    write(
        join(libRoot, 'project.json'),
        JSON.stringify(
            {
                name: pkgName,
                $schema: '../../../node_modules/nx/schemas/project-schema.json',
                sourceRoot: `libs/${moduleName}/${cfg.dir}/src`,
                projectType: 'library',
                tags: [`scope:${moduleName}`, cfg.tag],
            },
            null,
            2
        ) + '\n'
    );

    // tsconfig
    write(
        join(libRoot, 'tsconfig.json'),
        JSON.stringify(
            {
                extends: '../../../tsconfig.base.json',
                include: ['src/**/*.ts'],
            },
            null,
            2
        ) + '\n'
    );

    created.push({
        pkgName,
        dir: `libs/${moduleName}/${cfg.dir}`,
        count: files.length,
        srcIndex: `./libs/${moduleName}/${cfg.dir}/src/index.ts`,
    });
}

// ---------------------------------------------------------------------------
// 4. Enregistrer les paths TypeScript (résolution des `@cmz/<m>-*` par tsc/nx)
//
// L'import reste un nom de package (ADR-0004) ; le path indique seulement à
// TypeScript où trouver la source. C'est ce que fait `nx g lib`.
// ---------------------------------------------------------------------------
const tsBasePath = join(ROOT, 'tsconfig.base.json');
if (!dryRun) {
    let tsBase;
    try {
        tsBase = JSON.parse(readFileSync(tsBasePath, 'utf8'));
    } catch {
        tsBase = { compilerOptions: {} };
    }
    tsBase.compilerOptions ??= {};
    tsBase.compilerOptions.paths ??= {};
    for (const c of created) {
        tsBase.compilerOptions.paths[c.pkgName] = [c.srcIndex];
    }
    writeFileSync(tsBasePath, JSON.stringify(tsBase, null, 2) + '\n');
}

// ---------------------------------------------------------------------------
// Rapport
// ---------------------------------------------------------------------------
console.log(
    `\nAdaptateur SEOS — module « ${moduleName} »${dryRun ? ' (dry-run)' : ''}`
);
console.log(`Fichiers traités : ${moved} / ${allFiles.length}`);
console.log('\nLibs générées :');
for (const c of created) {
    console.log(
        `  ${c.pkgName.padEnd(40)} ${String(c.count).padStart(3)} fichiers  → ${c.dir}`
    );
}

if (unknownLayers.size > 0) {
    console.log('\n⚠ Éléments non cartographiés (à examiner) :');
    for (const u of [...unknownLayers].sort()) console.log(`  ${u}`);
    console.log(
        '  → couche absente de mapping.mjs LAYERS, ou couplage inter-domaine ' +
            '(cf. analyse Phase 03). Complétez la table plutôt que le code appelant.'
    );
}

console.log(
    dryRun
        ? '\n(dry-run : aucun fichier écrit)'
        : `\n✔ ${created.length} libs écrites sous libs/${moduleName}/`
);
