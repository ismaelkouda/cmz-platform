#!/usr/bin/env node
/**
 * Vérifie les préconditions de l'exception d'audit image-size.
 *
 * GitHub classe toutes les versions <= 2.0.2 comme vulnérables pour deux
 * boucles infinies dans les parseurs ICNS/JXL/HEIF. Le workspace reçoit
 * uniquement image-size@0.5.5 via la dépendance optionnelle de less@4.5.1.
 * Cette ancienne distribution ne contient aucun de ces parseurs et aucun
 * fichier Less Git-visible n'exerce la fonction image-size() de Less.
 *
 * L'exception reste donc acceptable uniquement tant que TOUTES les preuves
 * ci-dessous restent vraies. Toute dérive annule automatiquement l'exception.
 */

import { lstatSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export const EXCEPTION = Object.freeze({
    version: '0.5.5',
    lessVersion: '4.5.1',
    reviewBy: '2026-10-03',
    advisories: Object.freeze(['GHSA-w3rx-r6r6-pgpr', 'GHSA-5p2g-fcmc-qvqq']),
    integrity:
        'sha512-6TDAlDPZxUFCv+fuOkIoXT/V/f3Qbq8e37p+YOiYrUv3v9cc3/6x78VdfPgFVaB9dZYeLUfKgHRebpkm/oP2VQ==',
    parserFiles: Object.freeze([
        'bmp.js',
        'dds.js',
        'gif.js',
        'jpg.js',
        'png.js',
        'psd.js',
        'svg.js',
        'tiff.js',
        'webp.js',
    ]),
});

function fail(message) {
    throw new Error(`[image-size audit exception] ${message}`);
}

function count(text, needle) {
    return text.split(needle).length - 1;
}

function assertInside(root, candidate, label) {
    const rootReal = realpathSync(root);
    const candidateReal = realpathSync(candidate);
    const rel = relative(rootReal, candidateReal);
    if (
        rel === '..' ||
        rel.startsWith(`..${sep}`) ||
        resolve(rootReal, rel) !== candidateReal
    ) {
        fail(`${label} sort du workspace: ${candidate}`);
    }
}

function listGitVisibleLess(root) {
    const result = spawnSync(
        'git',
        ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
        { cwd: root, encoding: 'buffer' }
    );
    if (result.error || result.status !== 0) {
        const stderr = result.stderr.toString('utf8').trim();
        const detail =
            result.error?.message ?? (stderr || `exit ${result.status}`);
        fail(
            `Git ne peut pas établir le périmètre des fichiers Less (${detail})`
        );
    }
    return result.stdout
        .toString('utf8')
        .split('\0')
        .filter((path) => path.toLowerCase().endsWith('.less'))
        .sort();
}

function verifyLockfile(root) {
    const lock = readFileSync(join(root, 'bun.lock'), 'utf8');
    const imageNeedle = `"image-size": ["image-size@${EXCEPTION.version}"`;
    if (count(lock, imageNeedle) !== 1) {
        fail(
            `bun.lock doit contenir une occurrence exacte de image-size@${EXCEPTION.version}`
        );
    }
    if (count(lock, EXCEPTION.integrity) !== 1) {
        fail("l'intégrité npm attendue d'image-size@0.5.5 a dérivé");
    }

    const lessLines = lock
        .split('\n')
        .filter((line) =>
            line.includes(`"less": ["less@${EXCEPTION.lessVersion}"`)
        );
    if (lessLines.length !== 1) {
        fail(
            `bun.lock doit contenir une occurrence exacte de less@${EXCEPTION.lessVersion}`
        );
    }
    if (
        !lessLines[0].includes('"optionalDependencies"') ||
        !lessLines[0].includes('"image-size": "~0.5.0"')
    ) {
        fail(
            "image-size n'est plus exclusivement déclaré comme dépendance optionnelle de less"
        );
    }
}

function verifyInstalledPackage(root) {
    const packageRoot = join(
        root,
        'node_modules',
        '.bun',
        `image-size@${EXCEPTION.version}`,
        'node_modules',
        'image-size'
    );
    assertInside(root, packageRoot, 'package image-size installé');

    const packageStat = lstatSync(packageRoot);
    if (!packageStat.isDirectory() || packageStat.isSymbolicLink()) {
        fail(
            "le package image-size installé n'est pas un dossier physique contrôlé"
        );
    }

    const manifest = JSON.parse(
        readFileSync(join(packageRoot, 'package.json'), 'utf8')
    );
    if (
        manifest.name !== 'image-size' ||
        manifest.version !== EXCEPTION.version
    ) {
        fail(
            `manifest image-size inattendu: ${manifest.name}@${manifest.version}`
        );
    }

    const typeDir = join(packageRoot, 'lib', 'types');
    const entries = readdirSync(typeDir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        if (!entry.isFile() || entry.isSymbolicLink()) {
            fail(`entrée de parseur non régulière: lib/types/${entry.name}`);
        }
        files.push(entry.name);
    }
    files.sort();
    if (JSON.stringify(files) !== JSON.stringify(EXCEPTION.parserFiles)) {
        fail(
            `ensemble de parseurs inattendu: ${files.join(', ')} (l'exception interdit notamment ICNS/JXL/HEIF)`
        );
    }
}

export function verifyImageSizeAuditException(
    root,
    { now = new Date(), inspectInstalledPackage = true } = {}
) {
    const deadline = new Date(`${EXCEPTION.reviewBy}T23:59:59.999Z`);
    if (Number.isNaN(now.getTime()) || now > deadline) {
        fail(
            `revue expirée le ${EXCEPTION.reviewBy}; revérifier les avis officiels et supprimer ou renouveler explicitement l'exception`
        );
    }

    const lessFiles = listGitVisibleLess(root);
    if (lessFiles.length > 0) {
        fail(
            `un fichier Less Git-visible active désormais la surface concernée: ${lessFiles.join(', ')}`
        );
    }

    verifyLockfile(root);
    if (inspectInstalledPackage) verifyInstalledPackage(root);

    return Object.freeze({
        advisories: EXCEPTION.advisories,
        version: EXCEPTION.version,
        reviewBy: EXCEPTION.reviewBy,
    });
}

function isMain() {
    return (
        process.argv[1] &&
        resolve(process.argv[1]) === fileURLToPath(import.meta.url)
    );
}

if (isMain()) {
    try {
        const proof = verifyImageSizeAuditException(ROOT);
        console.log(
            `✔ Exception image-size bornée et valide — ${proof.version}, parseurs ICNS/JXL/HEIF absents, 0 fichier .less Git-visible, revue obligatoire avant le ${proof.reviewBy}.`
        );
    } catch (error) {
        console.error(
            `✖ ${error instanceof Error ? error.message : String(error)}`
        );
        process.exitCode = 1;
    }
}
