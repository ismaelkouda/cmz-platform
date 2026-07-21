#!/usr/bin/env node
/**
 * Refuse l'ajout de fichiers volumineux au dépôt (observation O3).
 *
 * Le projet d'origine versionne un `src/assets.zip` de 9,9 Mo ; son dépôt Git
 * pèse 87 Mo. Un binaire committé reste dans l'historique définitivement et se
 * retélécharge à chaque clone — le supprimer plus tard ne le retire pas du passé.
 *
 * Ce script est branché sur le hook pre-commit : il examine les fichiers mis en
 * scène, pas l'arbre entier, et échoue avant que le problème ne devienne
 * permanent.
 *
 * Usage : bun run check:weight [--all]
 */

import { execFileSync } from 'node:child_process';
import { statSync, existsSync } from 'node:fs';

const LIMITE_OCTETS = 1024 * 1024; // 1 Mo
const EXTENSIONS_SURVEILLEES = new Set([
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

const problemes = [];

for (const fichier of fichiersAExaminer()) {
    if (!existsSync(fichier)) continue;

    const taille = statSync(fichier).size;
    const extension = fichier.slice(fichier.lastIndexOf('.')).toLowerCase();
    const archiveOuBinaire = EXTENSIONS_SURVEILLEES.has(extension);

    if (taille > LIMITE_OCTETS || (archiveOuBinaire && taille > 100 * 1024)) {
        problemes.push({ fichier, taille, archiveOuBinaire });
    }
}

if (problemes.length === 0) {
    console.log('✔ Aucun fichier volumineux détecté.');
    process.exit(0);
}

console.error('\n✖ Fichiers trop volumineux pour être versionnés :\n');
for (const p of problemes) {
    console.error(
        `  ${p.fichier} — ${formaterTaille(p.taille)}${p.archiveOuBinaire ? ' (archive ou binaire)' : ''}`
    );
}
console.error(
    `\nLimite : ${formaterTaille(LIMITE_OCTETS)}, abaissée à 100 Ko pour les archives et binaires.` +
        "\nUn fichier committé reste dans l'historique pour toujours : hébergez-le hors du dépôt" +
        "\n(stockage d'artefacts, CDN, registre d'images)." +
        "\nSi l'ajout est réellement justifié : git commit --no-verify.\n"
);
process.exit(1);
