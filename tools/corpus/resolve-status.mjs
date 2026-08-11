/**
 * Résolution de statut d'une paire du corpus SEOS — logique pure.
 *
 * Extraite de `emit-pairs.mjs` (audit self-review post-ADR-0022,
 * 2026-08-11) : c'est l'Oracle lui-même (LLM_CONTEXT.md §1.2, "Oracle de
 * Vérification Stricte") qui décide `verified` / `pending` / `blocked` /
 * `n/a` / `emitted` pour chaque paire — une fonction avec 6 branches de
 * décision, sans aucun test, alors qu'elle gate la clôture de chaque
 * module (`emit-pairs.mjs --verify`, `printReport`'s `tranche-closed`).
 *
 * `emit-pairs.mjs` est un script CLI : son corps de module exécute
 * `process.argv`/`SEOS_LEGACY_ROOT`/`process.exit()` dès l'import, ce qui
 * rend tout import direct impossible en test (le test tuerait le process).
 * Ce fichier n'a, volontairement, **aucun effet de bord au niveau module** —
 * seulement des fonctions pures/déterministes prenant leurs dépendances en
 * paramètres — pour rester importable et testable isolément
 * (`resolve-status.test.mjs`).
 *
 * @see docs/architecture/corpus/README.md
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * @typedef {{
 *   id: string; legacy: string; nx: string | null; chain_id: string; node: string;
 *   pattern: string; module: string; volet?: string; layer: string; status: string;
 *   oracle?: string[];
 * }} CorpusPairLike
 */

/** @param {string | null} root @param {string | null} rel */
export function existsAt(root, rel) {
    if (!root || !rel) return false;
    return existsSync(join(root, rel));
}

/**
 * @param {CorpusPairLike} pair
 * @param {Set<string>} verifiedOracles
 * @param {{ structuralOnly: boolean; verify: boolean; legacyRoot: string | null; root: string }} opts
 * @returns {'n/a' | 'blocked' | 'pending' | 'emitted' | 'verified'}
 */
export function resolveStatus(pair, verifiedOracles, opts) {
    const { structuralOnly, verify, legacyRoot, root } = opts;

    if (pair.status === 'n/a') {
        return 'n/a';
    }

    if (!structuralOnly) {
        const legacyOk = existsAt(legacyRoot, pair.legacy);
        if (!legacyOk) {
            return 'blocked';
        }
    }

    if (!pair.nx) {
        return pair.status === 'n/a' ? 'n/a' : 'pending';
    }

    const nxOk = existsAt(root, pair.nx);
    if (!nxOk) {
        return 'pending';
    }

    if (!verify || !pair.oracle?.length) {
        return 'emitted';
    }

    const allOk = pair.oracle.every((o) => verifiedOracles.has(o));
    return allOk ? 'verified' : 'emitted';
}
