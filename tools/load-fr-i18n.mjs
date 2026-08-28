/**
 * Charge le dictionnaire FR pour les tools (check-i18n, fill-missing, …) sans
 * Angular ni bundler.
 *
 * Historique (avant ADR-0030/0036, convergence Transloco) : la source de
 * vérité était `apps/backoffice-angular/src/app/i18n/fr.translation.ts` (+
 * packs `fr/fr-pack-*.ts`), un module TypeScript transpilé à la volée (API
 * `typescript`) puis importé dynamiquement. La migration vers Transloco a
 * remplacé ce module par un fichier JSON statique servi en HTTP
 * (`TranslocoHttpLoader` → `i18n/${lang}.json`), cohérent avec le pattern
 * documenté dans docs/architecture/i18n-generator-scope.md pour toute app de
 * ce repo. `fr.translation.ts` et les packs associés ont été supprimés avec
 * le reste de `TranslationPort` (ADR-0036) — cette fonction lisait encore
 * l'ancien chemin, cassant check:i18n (ENOENT) sans que personne ne l'ait
 * remarqué avant un run CI complet.
 *
 * Correction : lire directement le JSON, pas de transpilation ni d'import
 * dynamique nécessaires — le format de clé (chemins pointés MAJUSCULES,
 * ex. `COMMON.CREATE`) est resté identique, donc `flattenFrKeys` (le
 * contrat consommé par check-i18n.mjs) n'a besoin d'aucun changement.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TOOLS_DIR = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(TOOLS_DIR, '..');
export const I18N_DIR = join(REPO_ROOT, 'apps/backoffice-angular/public/i18n');
export const FR_TRANSLATION_ENTRY = join(I18N_DIR, 'fr.json');

/**
 * @returns {Record<string, unknown>}
 */
export function loadFrModule() {
    let raw;
    try {
        raw = readFileSync(FR_TRANSLATION_ENTRY, 'utf8');
    } catch (error) {
        throw new Error(
            `Entrée i18n introuvable : ${FR_TRANSLATION_ENTRY} (${
                /** @type {Error} */ (error).message
            })`
        );
    }
    let FR;
    try {
        FR = JSON.parse(raw);
    } catch (error) {
        throw new Error(
            `Entrée i18n invalide (JSON malformé) : ${FR_TRANSLATION_ENTRY} (${
                /** @type {Error} */ (error).message
            })`
        );
    }
    if (!FR || typeof FR !== 'object' || Array.isArray(FR)) {
        throw new Error(
            `Entrée i18n invalide : ${FR_TRANSLATION_ENTRY} doit être un objet JSON, pas ${Array.isArray(FR) ? 'un tableau' : typeof FR}`
        );
    }
    return FR;
}

/**
 * Feuilles string du dictionnaire, paths pointés.
 * @param {Record<string, unknown>} FR
 * @returns {Set<string>}
 */
export function flattenFrKeys(FR) {
    const keys = new Set();
    (function walk(node, path) {
        for (const [key, value] of Object.entries(node)) {
            const nextPath = path ? `${path}.${key}` : key;
            if (typeof value === 'string') {
                keys.add(nextPath);
            } else if (value && typeof value === 'object') {
                walk(/** @type {Record<string, unknown>} */ (value), nextPath);
            }
        }
    })(FR, '');
    return keys;
}

/**
 * Async pour compatibilité d'appel (check-i18n.mjs fait `await
 * loadDefinedFrKeys()`) — la lecture elle-même est désormais synchrone
 * (JSON.parse), plus besoin de transpilation ni d'import dynamique.
 * @returns {Promise<Set<string>>}
 */
export async function loadDefinedFrKeys() {
    const FR = loadFrModule();
    return flattenFrKeys(FR);
}
