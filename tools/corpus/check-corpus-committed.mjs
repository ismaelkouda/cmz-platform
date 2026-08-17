#!/usr/bin/env node
/**
 * OPS-20 — vérifie que `corpus/*.pairs.jsonl` committé sur `main` est
 * fonctionnellement identique à ce que `corpus:full` vient de recalculer
 * dans le working tree, SANS faux positif sur les champs volatils par
 * construction (`oracle_report.ran_at` + tout `*.at` imbriqué — « evidence
 * horodatée », voir `oracle-report.mjs` — ET `verified_at` au niveau
 * racine de chaque paire, voir `emit-pairs.mjs`).
 *
 * `git diff --exit-code -- corpus/` seul échoue à CHAQUE run, même sans
 * aucun changement fonctionnel : `ran_at`/`at` sont réécrits avec
 * `new Date().toISOString()` par `buildOracleReport()`, et `verified_at`
 * (`today = ranAt.slice(0, 10)`, `emit-pairs.mjs` ligne ~191/207) est
 * réécrit à la date du jour pour **toute** paire `status === 'verified'` —
 * la quasi-totalité du corpus — à chaque exécution de `emit-pairs.mjs`.
 * Découvert le 2026-08-17 : la première version de ce script n'excluait
 * que `ran_at`/`at`, ratant `verified_at` qui vit au niveau racine de la
 * paire (pas dans `oracle_report`) — d'où 1507/1507 « divergences » sur un
 * run CI réel qui n'avait pourtant rien changé fonctionnellement.
 * Ce script compare donc `git show HEAD:<fichier>` (version committée) au
 * fichier du working tree (version recalculée), paire par paire, après
 * avoir supprimé récursivement toute clé nommée `ran_at`, `at` ou
 * `verified_at` de chaque objet JSON — pas un diff texte brut.
 *
 * Usage :
 *   node tools/corpus/check-corpus-committed.mjs
 *
 * Exit 0 si aucune divergence fonctionnelle. Exit 1 sinon, avec le détail
 * des fichiers/paires concernées.
 *
 * @see docs/architecture/taches-restantes.md, entrée OPS-20.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const CORPUS_DIR = join(ROOT, 'corpus');

/** Clés volatiles retirées avant comparaison — horodatage d'exécution, pas
 * de contenu métier. Toute autre clé (chemins, status, oracle, notes…) doit
 * rester strictement identique pour ne pas déclencher ce gate.
 * `verified_at` : date du jour de run (`emit-pairs.mjs`), pas une valeur
 * de contenu — voir le commentaire d'en-tête de ce fichier. */
const VOLATILE_KEYS = new Set(['ran_at', 'at', 'verified_at']);

/** @param {unknown} value @returns {unknown} */
function stripVolatile(value) {
    if (Array.isArray(value)) {
        return value.map(stripVolatile);
    }
    if (value && typeof value === 'object') {
        /** @type {Record<string, unknown>} */
        const out = {};
        for (const [k, v] of Object.entries(
            /** @type {Record<string, unknown>} */ (value)
        )) {
            if (VOLATILE_KEYS.has(k)) continue;
            out[k] = stripVolatile(v);
        }
        return out;
    }
    return value;
}

/** @param {string} content @returns {Map<string, unknown>} paire id → objet normalisé */
function parseJsonl(content) {
    const byId = new Map();
    const lines = content.split('\n').filter((l) => l.trim().length > 0);
    for (const line of lines) {
        const obj = JSON.parse(line);
        byId.set(obj.id, stripVolatile(obj));
    }
    return byId;
}

/** @param {string} relPath @returns {string | null} contenu committé, ou null si absent de HEAD */
function readCommitted(relPath) {
    try {
        return execFileSync('git', ['show', `HEAD:${relPath}`], {
            cwd: ROOT,
            encoding: 'utf8',
        });
    } catch {
        return null;
    }
}

function main() {
    if (!existsSync(CORPUS_DIR)) {
        console.error(`FAIL  dossier corpus/ absent : ${CORPUS_DIR}`);
        process.exit(1);
    }

    const files = execFileSync('git', ['ls-files', 'corpus/*.pairs.jsonl'], {
        cwd: ROOT,
        encoding: 'utf8',
    })
        .split('\n')
        .filter((f) => f.trim().length > 0);

    if (files.length === 0) {
        console.error('FAIL  aucun corpus/*.pairs.jsonl suivi par git');
        process.exit(1);
    }

    /** @type {{ file: string; kind: string; detail: string }[]} */
    const diffs = [];

    for (const relPath of files) {
        const committedRaw = readCommitted(relPath);
        const workingPath = join(ROOT, relPath);
        const workingRaw = existsSync(workingPath)
            ? readFileSync(workingPath, 'utf8')
            : null;

        if (committedRaw === null && workingRaw === null) continue;
        if (committedRaw === null) {
            diffs.push({
                file: relPath,
                kind: 'nouveau fichier',
                detail: 'présent après corpus:full, absent de HEAD',
            });
            continue;
        }
        if (workingRaw === null) {
            diffs.push({
                file: relPath,
                kind: 'fichier supprimé',
                detail: 'présent dans HEAD, absent après corpus:full',
            });
            continue;
        }

        const committed = parseJsonl(committedRaw);
        const working = parseJsonl(workingRaw);

        for (const [id, committedPair] of committed) {
            if (!working.has(id)) {
                diffs.push({
                    file: relPath,
                    kind: 'paire disparue',
                    detail: id,
                });
                continue;
            }
            const workingPair = working.get(id);
            if (JSON.stringify(committedPair) !== JSON.stringify(workingPair)) {
                diffs.push({
                    file: relPath,
                    kind: 'paire modifiée',
                    detail: id,
                });
            }
        }
        for (const id of working.keys()) {
            if (!committed.has(id)) {
                diffs.push({
                    file: relPath,
                    kind: 'paire nouvelle',
                    detail: id,
                });
            }
        }
    }

    if (diffs.length === 0) {
        console.log(
            `OK  corpus/*.pairs.jsonl committé identique (hors horodatage) à la sortie de corpus:full — ${files.length} fichier(s) vérifié(s).`
        );
        process.exit(0);
    }

    console.error(
        `FAIL  ${diffs.length} divergence(s) fonctionnelle(s) entre corpus/*.pairs.jsonl committé et la sortie réelle de corpus:full :\n`
    );
    const byFile = new Map();
    for (const d of diffs) {
        if (!byFile.has(d.file)) byFile.set(d.file, []);
        byFile.get(d.file).push(d);
    }
    for (const [file, items] of byFile) {
        console.error(`  ${file} (${items.length}) :`);
        for (const item of items.slice(0, 10)) {
            console.error(`    - ${item.kind} : ${item.detail}`);
        }
        if (items.length > 10) {
            console.error(`    ... et ${items.length - 10} de plus`);
        }
    }
    console.error(
        '\nRégénérer et committer explicitement :\n' +
            '  bun run corpus:full && git add corpus/ && git commit\n' +
            'Ne jamais éditer corpus/*.pairs.jsonl à la main sans faire tourner corpus:full ensuite.'
    );
    process.exit(1);
}

main();
