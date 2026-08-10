/**
 * Gate module corpus — audit H-2 / H-3 / P0-1 / P0-5 / P1-11.
 *
 * Avant toute écriture de `corpus/<module>.pairs.jsonl` (et sous `--verify`),
 * le module doit avoir **build** + **lint** verts sur `tag:scope:<module>`,
 * et **test** vert sur chaque projet du scope qui déclare un target Vitest.
 *
 * Absence totale de target `test` : avertissement (dette C-2), pas d'échec H-2 —
 * le niveau comportemental (H-1) s'activera dès qu'un `targets.test` existe.
 *
 * H-3 : aucun fichier du module byte-identique à un autre module
 * (`check-duplicate-files.mjs --module=<module>` — contrainte pattern.json).
 *
 * @see tools/corpus/oracle-levels.mjs
 * @see docs/architecture/audit-workspace-2026-08-02.md (H-2, H-3)
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const LAYERS = ['domain', 'data', 'application', 'ui'];

/**
 * @param {string} module
 * @returns {string[]} project names @cmz/<module>-<layer> that exist
 */
export function moduleProjects(module) {
    const out = [];
    for (const layer of LAYERS) {
        const pj = join(ROOT, 'libs', module, layer, 'project.json');
        if (!existsSync(pj)) continue;
        try {
            const name = JSON.parse(readFileSync(pj, 'utf8')).name;
            if (name) out.push(name);
        } catch {
            out.push(`@cmz/${module}-${layer}`);
        }
    }
    return out;
}

/**
 * @param {string} project
 * @returns {boolean}
 */
function projectHasTestTarget(project) {
    const m = project.match(/^@cmz\/(.+)-(domain|data|application|ui)$/);
    if (!m) return false;
    const path = join(ROOT, 'libs', m[1], m[2], 'project.json');
    if (!existsSync(path)) return false;
    try {
        return Boolean(JSON.parse(readFileSync(path, 'utf8'))?.targets?.test);
    } catch {
        return false;
    }
}

/**
 * @param {string} task build | lint | test
 * @param {string} module
 * @returns {{ ok: boolean; detail: string }}
 */
function runMany(task, module) {
    const cmd = `bunx nx run-many -t ${task} --projects=tag:scope:${module}`;
    try {
        execSync(cmd, {
            cwd: ROOT,
            stdio: 'pipe',
            env: process.env,
        });
        return { ok: true, detail: cmd };
    } catch (err) {
        const stderr = err?.stderr?.toString?.() ?? '';
        const stdout = err?.stdout?.toString?.() ?? '';
        const tail = (stderr || stdout).trim().split('\n').slice(-8).join('\n');
        return {
            ok: false,
            detail: `${cmd}\n${tail || err?.message || 'échec'}`,
        };
    }
}

/**
 * @typedef {{ ok: boolean; results: { task: string; ok: boolean; detail: string; skipped?: boolean }[] }} ModuleGateResult
 */

/**
 * @param {string} module
 * @returns {ModuleGateResult}
 */
export function runModuleGate(module) {
    /** @type {ModuleGateResult['results']} */
    const results = [];

    for (const task of ['build', 'lint']) {
        const r = runMany(task, module);
        results.push({ task, ...r });
        console.error(
            r.ok
                ? `[gate:H-2] ✓ ${task}  tag:scope:${module}`
                : `[gate:H-2] ✗ ${task}  tag:scope:${module}`
        );
        if (!r.ok) {
            console.error(r.detail);
        }
    }

    const projects = moduleProjects(module);
    const withTest = projects.filter(projectHasTestTarget);

    if (withTest.length === 0) {
        results.push({
            task: 'test',
            ok: true,
            skipped: true,
            detail: `aucun target test sous libs/${module}/{domain,data,application,ui} — dette C-2, gate H-2 non bloquante`,
        });
        console.error(
            `[gate:H-2] ⚠ test  tag:scope:${module} — aucun target test (C-2) ; build+lint suffisent pour émettre`
        );
    } else {
        const r = runMany('test', module);
        results.push({ task: 'test', ...r });
        console.error(
            r.ok
                ? `[gate:H-2] ✓ test  tag:scope:${module} (${withTest.length} projet(s))`
                : `[gate:H-2] ✗ test  tag:scope:${module}`
        );
        if (!r.ok) {
            console.error(r.detail);
        }
    }

    // H-3 — contrainte pattern.json : pas de copie byte-identique cross-module
    try {
        execSync(`node tools/check-duplicate-files.mjs --module=${module}`, {
            cwd: ROOT,
            stdio: 'pipe',
            env: process.env,
        });
        results.push({
            task: 'duplicates',
            ok: true,
            detail: `check-duplicate-files --module=${module}`,
        });
        console.error(
            `[gate:H-3] ✓ no cross-module byte-identical files — ${module}`
        );
    } catch (err) {
        const stderr = err?.stderr?.toString?.() ?? '';
        const stdout = err?.stdout?.toString?.() ?? '';
        const tail = (stderr || stdout)
            .trim()
            .split('\n')
            .slice(-12)
            .join('\n');
        results.push({
            task: 'duplicates',
            ok: false,
            detail: tail || err?.message || 'doublons détectés',
        });
        console.error(
            `[gate:H-3] ✗ cross-module byte-identical files — ${module}`
        );
        if (tail) console.error(tail);
    }

    const ok = results.every((r) => r.ok);
    return { ok, results };
}

/**
 * Échoue le process si le gate est rouge.
 * @param {string} module
 * @returns {ModuleGateResult}
 */
export function assertModuleGate(module) {
    console.error(
        `[gate] contrôle build + lint + test (H-2) + no-duplicates (H-3) — ${module}`
    );
    const result = runModuleGate(module);
    if (!result.ok) {
        console.error(
            `[gate] émission refusée pour « ${module} » — corriger build/lint/test/doublons avant d'écrire le corpus.`
        );
        process.exit(1);
    }
    console.error(`[gate] ✓ module ${module} — émission autorisée`);
    return result;
}
