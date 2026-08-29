#!/usr/bin/env node
/**
 * check-no-orphan-references.mjs
 *
 * Vérifie qu'un module retiré du repo (apps/libs supprimés) ne laisse
 * aucune référence orpheline dans le code, la config, ou les tests —
 * seules les mentions historiques explicitement allowlistées (ADR, notes
 * de retrait dans docs/architecture/) sont tolérées.
 *
 * Complément direct de tools/retire-module.mjs (audit staff, 2026-08-29) :
 * la vision du projet est de minimiser l'action humaine, donc une
 * suppression de module ne doit jamais reposer sur un audit manuel (grep
 * ad hoc, relecture fichier par fichier) — elle doit produire une preuve
 * automatique, rejouable en CI, de son exhaustivité.
 *
 * Usage :
 *   node tools/check-no-orphan-references.mjs --module <nom>
 *   node tools/check-no-orphan-references.mjs --module newsletter --allow docs/adr/0003-nommage-et-structure.md
 *   node tools/check-no-orphan-references.mjs --module newsletter --allow-active-fixture tools/generator-platform/sources/newsletter-subscribe.definition.json
 *
 * Recherche 3 familles de motifs pour <nom> :
 *   1. Le nom brut (ex: "newsletter") — mot entier, insensible à la casse
 *      sur les séparateurs habituels (-, _, /).
 *   2. Les alias de package @cmz/<nom>-* (toute couche).
 *   3. Les tags Nx scope:<nom>-* / scope:<nom>.
 *
 * Fichiers exclus par défaut : node_modules, dist, out-tsc, coverage,
 * .git, .angular, .nx, corpus (génération lourde, hors périmètre du
 * check), et ce script lui-même (il contient nécessairement le mot
 * "module" générique mais jamais un nom de module réel).
 *
 * Deux mécanismes d'exemption, volontairement distincts et non
 * interchangeables :
 *
 * --allow <chemin> : fichier où des mentions HISTORIQUES documentées
 * restent volontairement tolérées (ex: un ADR expliquant qu'un pattern a
 * été conçu via un POC depuis retiré). Répétable. Chaque fichier
 * allowlisté doit contenir une justification explicite ("retiré",
 * "supprimé", "POC" ou équivalent) à proximité d'une ligne contenant le
 * nom du module — sinon l'allowlist elle-même est rejetée comme trop
 * large (empêche d'allowlister un fichier "pour être tranquille" sans
 * réellement documenter le retrait).
 *
 * --allow-active-fixture <chemin> : fichier où le nom survit
 * intentionnellement comme IDENTIFIANT TECHNIQUE ACTIF (pas une mention
 * historique) — typiquement une fixture de test dont le nom coïncide
 * avec un module par ailleurs retiré (ex: sources/newsletter-subscribe.
 * definition.json, qui reste une entrée de test légitime du générateur
 * indépendamment de l'app newsletter supprimée), ou un fichier qui en
 * dépend directement. Aucune justification de "retrait" n'est exigée ici
 * — au contraire, ce mécanisme documente que le nom reste ACTIF, pas
 * qu'il est mort. Répétable.
 *
 * Exit 1 si une référence non allowlistée est trouvée, ou si une entrée
 * --allow ne contient in fine aucune justification vérifiable.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');

const SKIP_DIRS = new Set([
    'node_modules',
    'dist',
    'out-tsc',
    'coverage',
    '.git',
    '.angular',
    'corpus',
    '.nx',
]);

const SELF_PATH = new URL(import.meta.url).pathname;

const TEXT_EXT =
    /\.(ts|tsx|mts|cts|js|jsx|cjs|mjs|json|jsonc|md|yml|yaml|html|css|scss)$/;

function parseArgs(argv) {
    const options = { allow: [], allowActiveFixture: [] };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--module') options.module = argv[++i];
        else if (arg === '--allow') options.allow.push(argv[++i]);
        else if (arg === '--allow-active-fixture')
            options.allowActiveFixture.push(argv[++i]);
        else fail(`Argument inconnu : ${arg}`);
    }
    if (!options.module) fail('--module <nom> est requis (ex: newsletter).');
    return options;
}

function fail(message) {
    console.error(`\n✖ ${message}\n`);
    process.exit(1);
}

/** Trouve récursivement tous les fichiers texte pertinents sous ROOT. */
function findTextFiles(dir, results = []) {
    for (const entry of readdirSync(dir)) {
        if (SKIP_DIRS.has(entry)) continue;
        const full = join(dir, entry);
        if (full === SELF_PATH) continue;
        let st;
        try {
            st = statSync(full);
        } catch {
            continue;
        }
        if (st.isDirectory()) {
            findTextFiles(full, results);
        } else if (TEXT_EXT.test(entry)) {
            results.push(full);
        }
    }
    return results;
}

/**
 * Construit les motifs de recherche pour un module retiré. On ne peut
 * plus dériver ces alias du filesystem (le module a été supprimé) — on
 * les dérive donc du NOM fourni, en couvrant les formes canoniques que
 * ADR-0003 impose pour tout module (@cmz/<module>-<couche>, scope:<module>).
 */
function buildPatterns(moduleName) {
    const escaped = moduleName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return [
        // Nom brut en mot entier (frontières : début/fin de chaîne, ou
        // séparateur non-alphanumérique de part et d'autre).
        new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, 'i'),
    ];
}

function isJustified(fileContent, moduleName) {
    const justificationWords =
        /retir[ée]e?s?|supprim[ée]e?s?|retrait|removed|deleted|retired|POC/i;
    const nameRe = new RegExp(moduleName, 'i');
    const lines = fileContent.split('\n');
    // Fenêtre de 3 lignes (prose enveloppée sur plusieurs lignes) : le nom
    // du module et le mot de justification n'ont pas besoin d'être sur
    // exactement la même ligne, seulement à proximité immédiate.
    const WINDOW = 3;
    for (let i = 0; i < lines.length; i++) {
        if (!nameRe.test(lines[i])) continue;
        const start = Math.max(0, i - WINDOW);
        const end = Math.min(lines.length, i + WINDOW + 1);
        const window = lines.slice(start, end).join('\n');
        if (justificationWords.test(window)) return true;
    }
    return false;
}

function main() {
    const options = parseArgs(process.argv.slice(2));
    const patterns = buildPatterns(options.module);
    const allowSet = new Set(options.allow.map((p) => join(ROOT, p)));
    const allowActiveSet = new Set(
        options.allowActiveFixture.map((p) => join(ROOT, p))
    );

    // Toute entrée --allow (mention historique) doit réellement justifier
    // son exemption. --allow-active-fixture n'a pas cette exigence : il
    // documente l'inverse (le nom reste un identifiant technique actif).
    for (const allowedPath of allowSet) {
        let content;
        try {
            content = readFileSync(allowedPath, 'utf8');
        } catch {
            fail(
                `--allow référence un fichier introuvable : ${relative(ROOT, allowedPath)}`
            );
        }
        if (!isJustified(content, options.module)) {
            fail(
                `--allow ${relative(ROOT, allowedPath)} ne contient aucune ligne mentionnant ` +
                    `"${options.module}" avec un mot de justification (retiré/supprimé/POC/removed) — ` +
                    `allowlist rejetée. Documente explicitement le retrait avant d'exempter ce fichier, ` +
                    `ou utilise --allow-active-fixture si le nom reste un identifiant technique actif.`
            );
        }
    }
    for (const allowedPath of allowActiveSet) {
        try {
            readFileSync(allowedPath, 'utf8');
        } catch {
            fail(
                `--allow-active-fixture référence un fichier introuvable : ${relative(ROOT, allowedPath)}`
            );
        }
    }

    const files = findTextFiles(ROOT);
    const violations = [];

    for (const file of files) {
        if (allowSet.has(file) || allowActiveSet.has(file)) continue;
        let content;
        try {
            content = readFileSync(file, 'utf8');
        } catch {
            continue;
        }
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
            if (patterns.some((re) => re.test(line))) {
                violations.push({
                    file: relative(ROOT, file),
                    line: idx + 1,
                    text: line.trim().slice(0, 160),
                });
            }
        });
    }

    if (violations.length === 0) {
        console.log(
            `✅  check:no-orphan-references — aucune référence à "${options.module}" hors allowlist ` +
                `(${files.length} fichiers scannés, ${allowSet.size} exemptés/justifiés, ${allowActiveSet.size} fixtures actives)`
        );
        process.exit(0);
    }

    console.error(
        `\n❌  ${violations.length} référence(s) orpheline(s) à "${options.module}" détectée(s) :\n`
    );
    for (const v of violations) {
        console.error(`  ${v.file}:${v.line}\n    ${v.text}`);
    }
    console.error(
        `\nSoit ces fichiers doivent être nettoyés (tools/retire-module.mjs a laissé une trace), ` +
            `soit la mention est historique et légitime — dans ce cas, documente-la explicitement ` +
            `(pourquoi cette mention reste, que le module a été retiré) et ajoute le fichier via --allow.\n`
    );
    process.exit(1);
}

main();
