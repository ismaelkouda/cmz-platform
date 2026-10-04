/**
 * Charge le dictionnaire FR pour les tools (check-i18n, fill-missing, …) sans
 * Angular ni bundler.
 *
 * Le JSON reste la source d'édition contrôlée des identifiants dynamiques
 * hérités. Il n'est plus copié dans `public/` ni chargé par HTTP :
 * `generate-angular-localize-catalog.mjs` produit des tagged templates
 * `$localize` statiques, extrayables et remplaçables par Angular au build.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TOOLS_DIR = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(TOOLS_DIR, '..');
export const I18N_DIR = join(REPO_ROOT, 'apps/backoffice-angular/src/locale');
export const FR_TRANSLATION_ENTRY = join(I18N_DIR, 'messages.fr.source.json');

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
            })`,
            { cause: error }
        );
    }
    let FR;
    try {
        FR = JSON.parse(raw);
    } catch (error) {
        throw new Error(
            `Entrée i18n invalide (JSON malformé) : ${FR_TRANSLATION_ENTRY} (${
                /** @type {Error} */ (error).message
            })`,
            { cause: error }
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
