#!/usr/bin/env node
/**
 * Refuse l'ajout de fichiers volumineux au dépôt (observation O3 / audit F-6).
 *
 * 1. Poids binaire — un binaire committé reste dans l'historique définitivement.
 * 2. Plafond de lignes — un monolithe source (ex. l'ancien `tools/mock-server.mjs`
 *    à 3 939 l.) applique deux standards face à « un fichier = un symbole ».
 *    `tools/` est inclus : l'outillage n'est pas exempt.
 *
 * Mode défaut (pre-commit) : fichiers mis en scène uniquement.
 * Mode `--all` (CI) : tout l'arbre versionné.
 *
 * Usage : bun run check:weight [--all]
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';

const LIMITE_OCTETS = 1024 * 1024; // 1 Mo
/** Au-delà : découper (F-5) plutôt que grossir. */
const LIMITE_LIGNES = 800;

const EXTENSIONS_BINAIRES = new Set([
    '.zip',
    '.tar',
    '.gz',
    '.tgz',
    '.rar',
    '.7z',
    '.jar',
    '.war',
    '.apk',
    '.aab',
    '.ipa',
    '.mp4',
    '.mov',
    '.avi',
    '.mp3',
    '.wav',
    '.psd',
    '.ai',
    '.sketch',
    '.fig',
    '.exe',
    '.dll',
    '.so',
    '.dylib',
    '.bin',
]);

const EXTENSIONS_SOURCE = new Set([
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.mjs',
    '.cjs',
    '.html',
    '.scss',
    '.css',
]);

/**
 * Exceptions justifiées au plafond de lignes (chemin repo-relatif).
 * Toute entrée doit rester rare et commentée — pas un échappatoire.
 */
const ALLOWLIST_LIGNES = new Map([
    [
        'apps/backoffice-angular/src/app/i18n/fr.translation.ts',
        'dictionnaire i18n (données, pas de logique)',
    ],
    [
        'tools/corpus/mapping.mjs',
        'table de mapping corpus SEOS (données structurées)',
    ],
    [
        'tools/corpus/read-only-view.mjs',
        'générateur corpus read-only-view — découpage ultérieur',
    ],
]);

const analyserTout = process.argv.includes('--all');

function fichiersAExaminer() {
    const commande = analyserTout
        ? ['ls-files']
        : ['diff', '--cached', '--name-only', '--diff-filter=ACM'];

    return execFileSync('git', commande, { encoding: 'utf8' })
        .split('\n')
        .map((ligne) => ligne.trim())
        .filter(Boolean);
}

function formaterTaille(octets) {
    return octets >= 1024 * 1024
        ? `${(octets / 1024 / 1024).toFixed(1)} Mo`
        : `${Math.round(octets / 1024)} Ko`;
}

/** Aligné sur `wc -l` : nombre de newlines, +1 si pas de newline final. */
function compterLignes(fichier) {
    const buf = readFileSync(fichier);
    if (buf.length === 0) return 0;
    let n = 0;
    for (let i = 0; i < buf.length; i++) {
        if (buf[i] === 10) n++;
    }
    if (buf[buf.length - 1] !== 10) n++;
    return n;
}

function extensionOf(fichier) {
    const i = fichier.lastIndexOf('.');
    return i >= 0 ? fichier.slice(i).toLowerCase() : '';
}

const problemesPoids = [];
const problemesLignes = [];

for (const fichier of fichiersAExaminer()) {
    if (!existsSync(fichier)) continue;

    const extension = extensionOf(fichier);
    const taille = statSync(fichier).size;
    const archiveOuBinaire = EXTENSIONS_BINAIRES.has(extension);

    if (taille > LIMITE_OCTETS || (archiveOuBinaire && taille > 100 * 1024)) {
        problemesPoids.push({ fichier, taille, archiveOuBinaire });
    }

    if (!EXTENSIONS_SOURCE.has(extension)) continue;
    if (ALLOWLIST_LIGNES.has(fichier)) continue;

    const lignes = compterLignes(fichier);
    if (lignes > LIMITE_LIGNES) {
        problemesLignes.push({ fichier, lignes });
    }
}

if (problemesPoids.length === 0 && problemesLignes.length === 0) {
    console.log(
        analyserTout
            ? `✔ Poids et lignes OK (plafond ${LIMITE_LIGNES} l., tools/ inclus).`
            : `✔ Aucun fichier volumineux ni hors plafond de lignes (${LIMITE_LIGNES} l.) dans l'index.`
    );
    process.exit(0);
}

if (problemesPoids.length > 0) {
    console.error('\n✖ Fichiers trop volumineux pour être versionnés :\n');
    for (const p of problemesPoids) {
        console.error(
            `  ${p.fichier} — ${formaterTaille(p.taille)}${p.archiveOuBinaire ? ' (archive ou binaire)' : ''}`
        );
    }
    console.error(
        `\nLimite : ${formaterTaille(LIMITE_OCTETS)}, abaissée à 100 Ko pour les archives et binaires.` +
            "\nUn fichier committé reste dans l'historique pour toujours : hébergez-le hors du dépôt" +
            "\n(stockage d'artefacts, CDN, registre d'images)."
    );
}

if (problemesLignes.length > 0) {
    console.error(
        `\n✖ Fichiers source au-delà du plafond de ${LIMITE_LIGNES} lignes (tools/ inclus) :\n`
    );
    for (const p of problemesLignes.sort((a, b) => b.lignes - a.lignes)) {
        console.error(`  ${p.fichier} — ${p.lignes} lignes`);
    }
    console.error(
        '\nDécouper le fichier (un module / une responsabilité) plutôt que' +
            " d'étendre l'allowlist. Exceptions : voir ALLOWLIST_LIGNES dans" +
            '\ntools/check-file-weight.mjs — chaque entrée doit être justifiée.'
    );
}

console.error(
    "\nSi l'ajout est réellement justifié : git commit --no-verify.\n"
);
process.exit(1);
