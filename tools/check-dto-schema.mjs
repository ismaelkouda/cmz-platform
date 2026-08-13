#!/usr/bin/env node
/**
 * check-dto-schema.mjs — T2-2 (gate de fraîcheur DTO ↔ schéma).
 *
 * Ne valide PAS que les DTOs sont corrects (impossible — voir la limite
 * documentée dans docs/architecture/schema/dto.schema.json `description` et
 * docs/architecture/memo-openapi.md, section T2-1). Ce gate prouve
 * uniquement que `docs/architecture/schema/dto.schema.json`, tel que
 * committé, est la sortie exacte et actuelle de
 * `tools/schema/generate-dto-schema.mjs` sur l'état actuel des DTOs
 * TypeScript — même mécanisme que `tools/check-docs-freshness.mjs` :
 * régénérer (en mémoire, sans toucher au fichier committé), comparer.
 *
 * Ne couvre PAS (chantier séparé, non demandé pour T2-2) : la conformité
 * des mappers au schéma, ni la conformité du schéma à l'API réelle.
 *
 * Usage :
 *   node tools/check-dto-schema.mjs
 *   bun run check:dto-schema
 */

import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    generateSchema,
    serializeSchema,
    SCHEMA_OUT_PATH,
} from './schema/generate-dto-schema.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCHEMA_REL_PATH = 'docs/architecture/schema/dto.schema.json';

function fail(message) {
    console.error('');
    console.error('FAIL  check:dto-schema — ' + message);
    console.error('');
    console.error('Remède :');
    console.error('  node tools/schema/generate-dto-schema.mjs');
    console.error('  git add docs/architecture/schema/dto.schema.json');
    process.exit(1);
}

if (!existsSync(SCHEMA_OUT_PATH)) {
    fail(
        `${SCHEMA_REL_PATH} absent — jamais généré. Lancer ` +
            '`node tools/schema/generate-dto-schema.mjs` puis committer le résultat.'
    );
}

let regenerated;
try {
    const { schema, warnings, defCount, fileCount } = generateSchema();
    regenerated = await serializeSchema(schema);
    console.log(
        `INFO  régénéré en mémoire : ${defCount} définition(s) depuis ${fileCount} fichier(s) DTO`
    );
    if (warnings.length) {
        console.warn(
            `INFO  ${warnings.length} avertissement(s) de portée non couverte (voir generate-dto-schema.mjs pour la liste — non bloquant pour ce gate) :`
        );
        for (const w of warnings) {
            console.warn(`  - ${w.file} :: ${w.name ?? '?'} :: ${w.detail}`);
        }
    }
} catch (err) {
    fail(
        'la régénération en mémoire a échoué (' +
            String(err?.message ?? err) +
            ') — le générateur ne tourne pas proprement sur l’état actuel des DTOs.'
    );
}

const committed = readFileSync(SCHEMA_OUT_PATH, 'utf8');

if (committed !== regenerated) {
    // Diff lisible sans dépendance externe : écrit la version régénérée dans
    // un fichier temporaire et laisse `git diff --no-index` produire le diff
    // (git est déjà une dépendance système du dépôt — pas un ajout npm/bun).
    const tmpDir = mkdtempSync(join(tmpdir(), 'dto-schema-check-'));
    const tmpFile = join(tmpDir, 'dto.schema.regenerated.json');
    try {
        const { writeFileSync } = await import('node:fs');
        writeFileSync(tmpFile, regenerated, 'utf8');
        const { execFileSync } = await import('node:child_process');
        try {
            execFileSync(
                'git',
                ['diff', '--no-index', '--', SCHEMA_OUT_PATH, tmpFile],
                {
                    cwd: ROOT,
                    encoding: 'utf8',
                    stdio: ['ignore', 'inherit', 'pipe'],
                }
            );
        } catch (diffErr) {
            // git diff --no-index sort avec status 1 quand les fichiers diffèrent
            // (comportement attendu ici) — seul un statut inattendu doit remonter.
            if (diffErr.status !== 1) {
                console.error(
                    String(diffErr.stderr || diffErr.message || diffErr)
                );
            }
        }
    } finally {
        rmSync(tmpDir, { recursive: true, force: true });
    }

    fail(
        `${SCHEMA_REL_PATH} périmé — le schéma committé ne correspond plus à ` +
            'la sortie actuelle de generate-dto-schema.mjs sur les DTOs TypeScript ' +
            '(diff ci-dessus, tronqué au besoin par git).'
    );
}

console.log(
    `OK  check:dto-schema — ${SCHEMA_REL_PATH} à jour avec les DTOs TypeScript (T2-1/T2-2)`
);
process.exit(0);
