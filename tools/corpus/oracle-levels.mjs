/**
 * Niveaux d'oracle G-V-R (audit H-1 / P0-5).
 *
 * | Niveau         | Cible Nx   | Rôle                                      |
 * | -------------- | ---------- | ----------------------------------------- |
 * | structural     | `:build`   | Compile / types — forme monorepo          |
 * | behavioral     | `:test`    | Vitest (chantier C) — comportement        |
 * | functional     | Phase 09   | Équivalence legacy (hors emit-pairs)      |
 *
 * Le niveau comportemental s'attache automatiquement à tout oracle `:build`
 * dès que le projet Nx déclare un target `test` (project.json). Les modules
 * sans suite Vitest restent en build-only jusqu'à C-2/C-4.
 *
 * @see docs/architecture/generation-from-patterns.md §4
 * @see docs/architecture/audit-workspace-2026-08-02.md (H-1)
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** @type {Map<string, boolean>} */
const testTargetCache = new Map();

/**
 * @param {string} project ex. @cmz/processing-domain
 * @returns {string | null}
 */
export function projectJsonPath(project) {
    if (project === '@cmz/core') {
        return join(ROOT, 'libs/core/project.json');
    }
    if (!project.startsWith('@cmz/')) {
        return null;
    }
    const rest = project.slice('@cmz/'.length);
    for (const layer of ['domain', 'data', 'application', 'ui']) {
        const suffix = `-${layer}`;
        if (rest.endsWith(suffix)) {
            const module = rest.slice(0, -suffix.length);
            return join(ROOT, 'libs', module, layer, 'project.json');
        }
    }
    return null;
}

/**
 * @param {string} project ex. @cmz/processing-domain
 * @returns {boolean}
 */
export function hasNxTestTarget(project) {
    if (testTargetCache.has(project)) {
        return testTargetCache.get(project);
    }
    const path = projectJsonPath(project);
    if (!path || !existsSync(path)) {
        testTargetCache.set(project, false);
        return false;
    }
    try {
        const json = JSON.parse(readFileSync(path, 'utf8'));
        const has = Boolean(json?.targets?.test);
        testTargetCache.set(project, has);
        return has;
    } catch {
        testTargetCache.set(project, false);
        return false;
    }
}

/**
 * @param {string} target ex. @cmz/processing-domain:build
 * @returns {'structural' | 'behavioral' | 'other'}
 */
export function oracleLevel(target) {
    if (target.endsWith(':build')) return 'structural';
    if (target.endsWith(':test')) return 'behavioral';
    return 'other';
}

/**
 * Enrichit une liste d'oracles : pour chaque `:build` dont le projet a un
 * target `test`, ajoute `<project>:test` s'il est absent (niveau comportemental).
 *
 * @param {string[] | undefined} oracles
 * @returns {string[] | undefined}
 */
export function ensureBehavioralLevel(oracles) {
    if (!oracles?.length) return oracles;
    const out = [...oracles];
    for (const target of oracles) {
        if (!target.endsWith(':build')) continue;
        const project = target.slice(0, -':build'.length);
        const testTarget = `${project}:test`;
        if (!out.includes(testTarget) && hasNxTestTarget(project)) {
            out.push(testTarget);
        }
    }
    return out;
}

/**
 * Oracle structurel (+ comportemental si target test présent).
 *
 * @param {string} module
 * @param {string} layer domain | data | application | ui
 * @returns {string[]}
 */
export function layerOracles(module, layer) {
    return ensureBehavioralLevel([`@cmz/${module}-${layer}:build`]);
}
