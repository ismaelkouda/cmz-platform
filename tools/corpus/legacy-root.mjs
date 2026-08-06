/**
 * Résolution de SEOS_LEGACY_ROOT — audit B-1 / P0-6.
 *
 * Pas de fallback chemin machine. Variable d'environnement obligatoire
 * dès qu'un accès au dépôt legacy est requis.
 */

import { resolve } from 'node:path';

/**
 * @param {{ optional?: boolean }} [opts]
 * @returns {string | null} chemin absolu, ou null si optional et absent
 */
export function requireLegacyRoot(opts = {}) {
    const optional = opts.optional === true;
    const raw = process.env.SEOS_LEGACY_ROOT?.trim();

    if (!raw) {
        if (optional) {
            return null;
        }
        console.error(
            [
                'SEOS_LEGACY_ROOT est obligatoire (aucun fallback chemin local).',
                '',
                '  export SEOS_LEGACY_ROOT=/chemin/vers/cmz-backoffice-frontend',
                '',
                'Pour le corpus PR sans legacy : --structural-only ou CORPUS_STRUCTURAL_ONLY=1',
                '(alias déprécié : --oracle-only / CORPUS_ORACLE_ONLY=1 — ADR-0015).',
                'Voir docs/architecture/corpus/README.md — audit P0-6 / B-1.',
            ].join('\n')
        );
        process.exit(1);
    }

    return resolve(raw);
}
