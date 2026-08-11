#!/usr/bin/env node
/**
 * Émet le manifest corpus JSONL — paires legacy → Nx (hybride file-level + chain_id).
 *
 * Usage:
 *   node tools/corpus/emit-pairs.mjs processing [--verify] [--structural-only] [--tranche A|B] [--report] [--dry-run]
 *
 * --structural-only : vérification structurelle Nx Tier 1 — ignore chemins legacy
 *   (ADR-0015 / audit B-6). Alias déprécié : --oracle-only / CORPUS_ORACLE_ONLY=1.
 * Hors --structural-only : SEOS_LEGACY_ROOT obligatoire (pas de fallback, audit B-1).
 *
 * Oracle empilé (audit H-1) : `:build` (structural) + `:test` (behavioral /
 * chantier C) dès que le projet déclare un target Vitest — voir
 * tools/corpus/oracle-levels.mjs.
 *
 * Gate module (audit H-2 / H-3) : avant écriture JSONL (et sous `--verify`),
 * `build` + `lint` (+ `test` si target) verts + aucun fichier byte-identique
 * cross-module — sinon exit 1, fichier non écrit. Voir module-gate.mjs.
 *
 * @see docs/architecture/corpus/README.md
 * @see docs/adr/0015-mode-structural-only-pas-de-correspondance-legacy.md
 */

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    CHAINS as WORKFLOW_CHAINS,
    MODULES as WORKFLOW_MODULES,
} from './chains.mjs';
import { expandChain as expandWorkflowChain } from './mapping.mjs';
import {
    READ_ONLY_VIEW_CHAINS,
    READ_ONLY_VIEW_MODULES,
    expandReadOnlyViewChain,
} from './read-only-view.mjs';
import {
    DASHBOARD_CHAINS,
    DASHBOARD_MODULES,
    expandDashboardChain,
} from './dashboard.mjs';
import {
    CRUD_ENTITY_CHAINS,
    CRUD_ENTITY_MODULES,
    expandCrudEntityChain,
} from './crud-entity.mjs';
import { requireLegacyRoot } from './legacy-root.mjs';
import { assertModuleGate } from './module-gate.mjs';
import { oracleLevel } from './oracle-levels.mjs';
import { buildOracleReport } from './oracle-report.mjs';
import { existsAt, resolveStatus } from './resolve-status.mjs';

const CHAINS = {
    ...WORKFLOW_CHAINS,
    ...READ_ONLY_VIEW_CHAINS,
    ...DASHBOARD_CHAINS,
    ...CRUD_ENTITY_CHAINS,
};
const MODULES = {
    ...WORKFLOW_MODULES,
    ...READ_ONLY_VIEW_MODULES,
    ...DASHBOARD_MODULES,
    ...CRUD_ENTITY_MODULES,
};

/** @param {string} mod @param {object} chain */
function expandForModule(mod, chain) {
    const def = MODULES[mod];
    if (def?.pattern === 'crud-entity') {
        return expandCrudEntityChain(mod, chain);
    }
    if (def?.pattern === 'read-only-view') {
        return expandReadOnlyViewChain(mod, chain);
    }
    if (def?.pattern === 'aggregated-stats-view') {
        return expandDashboardChain(mod, chain);
    }
    return expandWorkflowChain(mod, chain);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

/**
 * @typedef {{ commit: string; repo?: string; date?: string }} LegacyRef
 * @typedef {{
 *   id: string; legacy: string; nx: string | null; chain_id: string; node: string;
 *   pattern: string; module: string; volet?: string; layer: string; status: string;
 *   oracle?: string[]; verified_at?: string; notes?: string; assumption_ref?: string;
 *   legacy_ref?: LegacyRef; oracle_report?: import('./oracle-report.mjs').OracleReport;
 * }} CorpusPair
 */

const args = process.argv.slice(2);
const moduleName = args[0];
const verify = args.includes('--verify');
/** ADR-0015 — structural-only = oracles Nx, pas de correspondance legacy. */
const structuralOnly =
    args.includes('--structural-only') ||
    args.includes('--oracle-only') || // alias déprécié
    process.env.CORPUS_STRUCTURAL_ONLY === '1' ||
    process.env.CORPUS_ORACLE_ONLY === '1'; // alias déprécié
const trancheIdx = args.indexOf('--tranche');
const tranche =
    trancheIdx !== -1 ? args[trancheIdx + 1]?.toUpperCase() : undefined;
const chainIdx = args.indexOf('--chain');
const chainFilter = chainIdx !== -1 ? args[chainIdx + 1] : undefined;
const reportOnly = args.includes('--report');
const dryRun = args.includes('--dry-run');

if (!moduleName || moduleName.startsWith('--')) {
    console.error(
        'Usage: node tools/corpus/emit-pairs.mjs <module> [--verify] [--report] [--dry-run]'
    );
    process.exit(1);
}

/** Requis hors --structural-only (audit B-1 / P0-6). */
const LEGACY_ROOT = requireLegacyRoot({ optional: structuralOnly });

/** Pin legacy — audit B-4 / ADR-0014. Toujours depuis legacy.lock.json. */
function loadLegacyRef() {
    const lockPath = join(ROOT, 'legacy.lock.json');
    if (!existsSync(lockPath)) {
        console.error(
            'legacy.lock.json absent — requis pour tamponner legacy_ref (audit B-4).'
        );
        process.exit(1);
    }
    const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
    if (!lock.commit || !/^[0-9a-f]{40}$/i.test(lock.commit)) {
        console.error('legacy.lock.json#commit invalide (SHA40 attendu).');
        process.exit(1);
    }
    /** @type {LegacyRef} */
    const ref = { commit: String(lock.commit).toLowerCase() };
    if (lock.repo) ref.repo = lock.repo;
    if (lock.date) ref.date = lock.date;
    return ref;
}

const LEGACY_REF = loadLegacyRef();

const moduleDef = MODULES[moduleName];
if (!moduleDef) {
    console.error(
        `Module inconnu: ${moduleName}. Disponibles: ${Object.keys(MODULES).join(', ')}`
    );
    process.exit(1);
}

/** @param {string} target ex. @cmz/processing-domain:build */
function runOracle(target) {
    const [project, task] = target.split(':');
    execSync(`bunx nx run ${project}:${task}`, {
        cwd: ROOT,
        stdio: 'pipe',
        env: process.env,
    });
}

/** @param {CorpusPair[]} pairs */
function emitPairs(pairs, gateResult) {
    const verifiedOracles = new Set();
    /** @type {{ structural: number; behavioral: number; other: number }} */
    const byLevel = { structural: 0, behavioral: 0, other: 0 };
    const ranAt = new Date().toISOString();

    if (verify) {
        const uniqueOracles = [
            ...new Set(pairs.flatMap((p) => p.oracle ?? [])),
        ];
        for (const oracle of uniqueOracles) {
            const level = oracleLevel(oracle);
            byLevel[level] += 1;
            try {
                runOracle(oracle);
                verifiedOracles.add(oracle);
                console.error(`[oracle:${level}] ✓ ${oracle}`);
            } catch {
                console.error(`[oracle:${level}] ✗ ${oracle}`);
            }
        }
        console.error(
            `[oracle] niveaux — structural=${byLevel.structural} behavioral=${byLevel.behavioral}` +
                (byLevel.other ? ` other=${byLevel.other}` : '')
        );
    }

    const today = ranAt.slice(0, 10);

    return pairs.map((pair) => {
        const status = resolveStatus(pair, verifiedOracles, {
            structuralOnly,
            verify,
            legacyRoot: LEGACY_ROOT,
            root: ROOT,
        });
        const out = {
            ...pair,
            status,
            nx: pair.nx ?? null,
            legacy_ref: LEGACY_REF,
        };
        if (status === 'verified') {
            out.verified_at = today;
        }
        if (status === 'blocked' && !out.notes) {
            out.notes = `Legacy introuvable: ${pair.legacy}`;
        }
        // H-5 / T2-7 — evidence horodatée uniquement sur passe --verify
        if (verify) {
            out.oracle_report = buildOracleReport({
                structuralOnly,
                gate: gateResult,
                pairOracle: pair.oracle,
                verifiedOracles,
                levels: byLevel,
                ranAt,
            });
        } else if (out.oracle_report) {
            // Ne pas propager un report périmé d'une expansion source
            delete out.oracle_report;
        }
        return out;
    });
}

/** @param {CorpusPair[]} pairs @returns {boolean} all tranches closed */
function printReport(pairs) {
    const byChain = new Map();
    for (const p of pairs) {
        if (!byChain.has(p.chain_id)) byChain.set(p.chain_id, []);
        byChain.get(p.chain_id).push(p);
    }

    console.log(`\n# Corpus report — ${moduleName}`);
    console.log(
        `Legacy root: ${LEGACY_ROOT ?? '(non requis — structural-only)'}${structuralOnly ? ' (legacy ignoré — ADR-0015)' : ''}`
    );
    console.log(
        `Legacy ref: ${LEGACY_REF.commit.slice(0, 12)} (${LEGACY_REF.date ?? '?'})`
    );
    console.log(`Nx root: ${ROOT}\n`);

    let allClosed = true;

    for (const [chainId, chainPairs] of byChain) {
        const chain = CHAINS[chainId];
        const counts = {
            verified: 0,
            emitted: 0,
            pending: 0,
            blocked: 0,
            'n/a': 0,
        };
        for (const p of chainPairs) counts[p.status]++;

        const applicableCount = chainPairs.filter(
            (p) => p.status !== 'n/a'
        ).length;
        const verifiedRatio = applicableCount
            ? counts.verified / applicableCount
            : 1;
        const emitThreshold = chain?.threshold_emit ?? 0.8;
        const closeThreshold = chain?.threshold_close ?? 1.0;
        const corpusReady = verifiedRatio >= emitThreshold;
        const trancheClosed =
            verifiedRatio >= closeThreshold &&
            counts.blocked === 0 &&
            counts.pending === 0;

        if (!trancheClosed) allClosed = false;

        console.log(`## ${chainId}`);
        console.log(`   ${chain?.description ?? ''}`);
        console.log(
            `   verified=${counts.verified} emitted=${counts.emitted} pending=${counts.pending} n/a=${counts['n/a']} blocked=${counts.blocked}`
        );
        console.log(
            `   verified/applicable=${Math.round(verifiedRatio * 100)}%`
        );
        console.log(
            `   → ${corpusReady ? '✅' : '🔧'} corpus-ready (≥${emitThreshold * 100}% verified, émission intermédiaire)`
        );
        console.log(
            `   → ${trancheClosed ? '✅' : '🔧'} tranche-closed (100% verified, clôture tranche A)`
        );
        console.log('');
    }

    return allClosed;
}

// --- main ---

/** @param {string[]} chainIds */
function filterChainsByTranche(chainIds) {
    if (!tranche) return chainIds;
    if (tranche === 'A') {
        return chainIds.filter((id) => {
            const c = CHAINS[id];
            return c?.subgraph === 'list_volet' || id.endsWith('.module.shell');
        });
    }
    if (tranche === 'B') {
        return chainIds.filter((id) => CHAINS[id]?.subgraph === 'details');
    }
    console.error(`Tranche inconnue: ${tranche}. Valeurs: A, B`);
    process.exit(1);
}

const chainIds = filterChainsByTranche(moduleDef.chains).filter((id) =>
    chainFilter ? id === chainFilter : true
);

if (chainFilter && chainIds.length === 0) {
    console.error(`Chaîne inconnue pour ${moduleName}: ${chainFilter}`);
    process.exit(1);
}

/** Écriture du manifest principal (hors report / dry-run / --chain). */
const willWrite = !reportOnly && !dryRun && !chainFilter;

// Audit H-2 — pas d'émission (ni verify) si build/lint/test module non verts.
/** @type {import('./module-gate.mjs').ModuleGateResult | null} */
let gateResult = null;
if (verify || willWrite) {
    gateResult = assertModuleGate(moduleName);
}

/** @type {CorpusPair[]} */
const allPairs = [];
for (const chainId of chainIds) {
    allPairs.push(...expandForModule(moduleName, CHAINS[chainId]));
}

const resolved = emitPairs(allPairs, gateResult);

if (reportOnly || dryRun) {
    const ok = printReport(resolved);
    if (dryRun) {
        console.log(`[dry-run] ${resolved.length} paires — non écrites`);
    }
    if (verify && !ok) process.exit(1);
    process.exit(0);
}

const outDir = join(ROOT, 'corpus');
const outFile = join(outDir, `${moduleName}.pairs.jsonl`);

const lines = resolved.map((p) => JSON.stringify(p)).join('\n') + '\n';

if (chainFilter) {
    console.error(
        `[chain] ${resolved.length} paires pour ${chainFilter} — manifest principal non écrasé (utiliser sans --chain pour écrire corpus/${moduleName}.pairs.jsonl)`
    );
} else {
    mkdirSync(outDir, { recursive: true });
    writeFileSync(outFile, lines, 'utf8');
    console.error(`Wrote ${resolved.length} pairs → ${outFile}`);
}
const allClosed = printReport(resolved);
if (verify && !allClosed) {
    process.exit(1);
}
