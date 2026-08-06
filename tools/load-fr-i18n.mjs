/**
 * Charge le dictionnaire `FR` (façade + packs sous `i18n/fr/`) pour les tools
 * (check-i18n, fill-missing, …) sans Angular ni bundler : transpile TypeScript
 * API → modules ESM dans un temp, imports relatifs réécrits en `.mjs`
 * (résolution Node ESM stricte).
 *
 * Après le découpage poids fichier, `fr.translation.ts` n'est plus un monolithe :
 * un seul fichier temp ne suffit plus.
 */
import {
    mkdirSync,
    mkdtempSync,
    readdirSync,
    readFileSync,
    writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const TOOLS_DIR = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(TOOLS_DIR, '..');
export const I18N_DIR = join(REPO_ROOT, 'apps/backoffice-angular/src/app/i18n');
export const FR_TRANSLATION_ENTRY = join(I18N_DIR, 'fr.translation.ts');

/**
 * @param {string} js
 * @returns {string}
 */
function rewriteRelativeImportsWithMjs(js) {
    return js.replace(/from\s+(['"])(\.[^'"]+)\1/g, (full, quote, spec) => {
        if (/\.(mjs|cjs|js|json)$/.test(spec)) return full;
        return `from ${quote}${spec}.mjs${quote}`;
    });
}

/**
 * @param {string} dir
 * @param {string[]} acc
 * @returns {string[]}
 */
function listTsFiles(dir, acc = []) {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, ent.name);
        if (ent.isDirectory()) {
            listTsFiles(path, acc);
            continue;
        }
        if (ent.name.endsWith('.ts') && !ent.name.endsWith('.spec.ts')) {
            acc.push(path);
        }
    }
    return acc;
}

/**
 * Fichiers du graphe dictionnaire FR uniquement (pas i18n.provider Angular).
 * @param {string} absPath
 */
function isFrDictionaryTs(absPath) {
    const rel = relative(I18N_DIR, absPath).replace(/\\/g, '/');
    return rel === 'fr.translation.ts' || /^fr\/fr-pack-\d+\.ts$/.test(rel);
}

/**
 * @returns {Promise<{ FR: Record<string, unknown>, tmpDir: string }>}
 */
export async function loadFrModule() {
    const tmpDir = mkdtempSync(join(tmpdir(), 'cmz-check-i18n-'));
    const sources = listTsFiles(I18N_DIR).filter(isFrDictionaryTs);
    if (!sources.includes(FR_TRANSLATION_ENTRY)) {
        throw new Error(`Entrée i18n introuvable : ${FR_TRANSLATION_ENTRY}`);
    }

    for (const absTs of sources) {
        const source = readFileSync(absTs, 'utf8');
        const { outputText } = ts.transpileModule(source, {
            compilerOptions: {
                module: ts.ModuleKind.ESNext,
                target: ts.ScriptTarget.ES2022,
            },
        });
        const rel = relative(I18N_DIR, absTs);
        const outPath = join(
            tmpDir,
            rel.replace(/\.ts$/i, '.mjs').replace(/\\/g, '/')
        );
        mkdirSync(dirname(outPath), { recursive: true });
        writeFileSync(outPath, rewriteRelativeImportsWithMjs(outputText));
    }

    const entry = join(tmpDir, 'fr.translation.mjs');
    const mod = await import(`file://${entry}`);
    if (!mod?.FR || typeof mod.FR !== 'object') {
        throw new Error('Export FR manquant après transpile i18n');
    }
    return { FR: mod.FR, tmpDir };
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
 * @returns {Promise<Set<string>>}
 */
export async function loadDefinedFrKeys() {
    const { FR } = await loadFrModule();
    return flattenFrKeys(FR);
}
