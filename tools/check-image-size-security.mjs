#!/usr/bin/env node
/**
 * Empêche la réintroduction de la chaîne historique
 * less@4.5.1 -> image-size@0.5.5.
 *
 * Le dépôt n'utilise aucun fichier Less : Less ne doit donc pas devenir une
 * dépendance racine ou un usage applicatif implicite. Les outils Angular/Vite
 * peuvent cependant conserver Less comme peer optionnelle corrigée dans le
 * lockfile. image-size, ancienne dépendance de Less, reste interdit partout.
 */

import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEPENDENCY_SECTIONS = Object.freeze([
    'dependencies',
    'devDependencies',
    'optionalDependencies',
    'peerDependencies',
]);

function fail(message) {
    throw new Error(`[image-size security] ${message}`);
}

function declaredDependency(manifest, packageName) {
    for (const section of DEPENDENCY_SECTIONS) {
        const dependencies = manifest[section];
        if (
            dependencies &&
            typeof dependencies === 'object' &&
            Object.hasOwn(dependencies, packageName)
        ) {
            return { section, version: dependencies[packageName] };
        }
    }
    return undefined;
}

function hasOverride(manifest, packageName) {
    return (
        manifest.overrides &&
        typeof manifest.overrides === 'object' &&
        Object.hasOwn(manifest.overrides, packageName)
    );
}

function gitVisibleLessFiles(root) {
    const result = spawnSync(
        'git',
        ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
        { cwd: root, encoding: 'buffer' }
    );
    if (result.error || result.status !== 0) {
        const detail =
            result.error?.message ||
            result.stderr.toString('utf8').trim() ||
            `exit ${result.status}`;
        fail(`impossible d'établir les sources Git-visibles (${detail})`);
    }
    return result.stdout
        .toString('utf8')
        .split('\0')
        .filter((path) => path.toLowerCase().endsWith('.less'))
        .sort();
}

export function verifyImageSizeSecurity(root) {
    const lessFiles = gitVisibleLessFiles(root);
    if (lessFiles.length > 0) {
        fail(
            `fichier Less détecté sans adoption formalisée: ${lessFiles.join(', ')}`
        );
    }

    const manifest = JSON.parse(
        readFileSync(join(root, 'package.json'), 'utf8')
    );
    const directImageSize = declaredDependency(manifest, 'image-size');
    if (directImageSize) {
        fail(
            `image-size ne doit pas devenir une dépendance racine (${directImageSize.section}: ${directImageSize.version})`
        );
    }

    const directLess = declaredDependency(manifest, 'less');
    if (directLess) {
        fail(
            `Less ne doit pas devenir une dépendance racine inutilisée (${directLess.section}: ${directLess.version}); formaliser d'abord un usage .less réel`
        );
    }

    if (hasOverride(manifest, 'image-size')) {
        fail('un override image-size dormant est interdit');
    }

    if (hasOverride(manifest, 'less')) {
        fail('un override Less dormant est interdit sans usage Less déclaré');
    }

    const lock = readFileSync(join(root, 'bun.lock'), 'utf8');
    if (/"image-size"\s*:/.test(lock) || /\["image-size@[^"\]]+"/.test(lock)) {
        fail('bun.lock ne doit résoudre ni déclarer le paquet image-size');
    }

    return Object.freeze({
        lessResolvedAsOptionalPeer: /\["less@[^"\]]+"/.test(lock),
        imageSizeInstalled: false,
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
        verifyImageSizeSecurity(ROOT);
        console.log(
            `✔ image-size absent — aucun usage Less, dépendance racine ou override implicite.`
        );
    } catch (error) {
        console.error(
            `✖ ${error instanceof Error ? error.message : String(error)}`
        );
        process.exitCode = 1;
    }
}
