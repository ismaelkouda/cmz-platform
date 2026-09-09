import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { stableJson } from './library-plan.mjs';

const RUNNER_INPUTS = [
    'tools/add-library.mjs',
    'tools/check-library-setup.mjs',
    'tools/check-library-setup-deps.mjs',
    'tools/scaffold-tailwind.mjs',
    'tools/generator-platform/validate-ir.mjs',
];

function fail(message) {
    throw new Error(`library tooling fingerprint: ${message}`);
}

function addRegularFile(hash, root, path) {
    const absolute = join(root, path);
    const stats = lstatSync(absolute);
    if (stats.isSymbolicLink() || !stats.isFile()) {
        fail(`entrée non régulière : ${path}`);
    }
    hash.update(path).update('\0').update(readFileSync(absolute)).update('\0');
}

/**
 * Empreinte unique de tout le code qui planifie, exécute ou contrôle
 * add-library. Les tests sont exclus : ils ne participent pas à l'exécution.
 */
export function libraryRunnerDigest(root) {
    const hash = createHash('sha256');
    function visit(directory, prefix) {
        for (const name of readdirSync(directory).sort()) {
            const absolute = join(directory, name);
            const path = `${prefix}/${name}`;
            const stats = lstatSync(absolute);
            if (stats.isSymbolicLink())
                fail(`runner contient un lien : ${path}`);
            if (stats.isDirectory()) visit(absolute, path);
            else if (stats.isFile() && !path.endsWith('.test.mjs')) {
                addRegularFile(hash, root, path);
            }
        }
    }
    visit(join(root, 'tools/library-setup'), 'tools/library-setup');
    for (const path of RUNNER_INPUTS) addRegularFile(hash, root, path);
    return hash.digest('hex');
}

/** Tout le sens fonctionnel d'une piste, hors état de promotion. */
export function compatibilityTrackDigest(track) {
    const { status: _status, verification: _verification, ...contract } = track;
    return createHash('sha256').update(stableJson(contract)).digest('hex');
}
