#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { lstatSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const DIRECTORY = join(ROOT, 'docs', 'architecture', 'removed-modules');
const args = process.argv.slice(2);
if (args.length > 1 || args.some((argument) => argument !== '--prune-stale')) {
    console.error(`❌  Argument inconnu : ${args.join(' ')}`);
    process.exit(1);
}
const pruneStale = args.includes('--prune-stale');

let directoryMetadata;
try {
    directoryMetadata = lstatSync(DIRECTORY);
} catch (error) {
    if (error.code !== 'ENOENT') throw error;
    console.log('✅  Aucun tombstone de module retiré à valider.');
    process.exit(0);
}

if (!directoryMetadata.isDirectory() || directoryMetadata.isSymbolicLink()) {
    console.error(
        '❌  Le répertoire des tombstones doit être un dossier physique.'
    );
    process.exit(1);
}

const files = readdirSync(DIRECTORY).sort();
for (const file of files) {
    const path = join(DIRECTORY, file);
    const metadata = lstatSync(path);
    if (
        !/^[a-z][a-z0-9-]*\.json$/.test(file) ||
        !metadata.isFile() ||
        metadata.isSymbolicLink()
    ) {
        console.error(
            `❌  Entrée non canonique dans removed-modules : ${file}. ` +
                `Seuls les fichiers réguliers <module-kebab>.json sont admis.`
        );
        process.exit(1);
    }
}
for (const file of files) {
    let document;
    try {
        document = JSON.parse(readFileSync(join(DIRECTORY, file), 'utf8'));
    } catch (error) {
        console.error(`❌  Tombstone illisible ${file}: ${error.message}`);
        process.exit(1);
    }
    if (typeof document.module !== 'string') {
        console.error(`❌  Tombstone sans module valide : ${file}`);
        process.exit(1);
    }
    const result = spawnSync(
        process.execPath,
        [
            join(ROOT, 'tools', 'check-no-orphan-references.mjs'),
            '--module',
            document.module,
            pruneStale ? '--update-tombstone' : '--tombstone',
            `docs/architecture/removed-modules/${file}`,
        ],
        { cwd: ROOT, encoding: 'utf8' }
    );
    process.stdout.write(result.stdout || '');
    process.stderr.write(result.stderr || '');
    if (result.status !== 0) process.exit(result.status || 1);
}
console.log(
    `✅  ${files.length} tombstone(s) de modules retirés ` +
        `${pruneStale ? 'réconcilié(s) puis validé(s)' : 'validé(s)'}.`
);
