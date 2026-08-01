#!/usr/bin/env node
/**
 * Émet le manifest corpus JSONL — paires legacy → Nx (hybride file-level + chain_id).
 *
 * Usage:
 *   node tools/corpus/emit-pairs.mjs processing [--verify] [--oracle-only] [--tranche A|B] [--report] [--dry-run]
 *
 * --oracle-only : Tier 1 CI — ignore legacy path (A-2026-07-30-08), oracle nx seulement.
 *
 * @see docs/architecture/corpus/README.md
 */

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
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

const CHAINS = { ...WORKFLOW_CHAINS, ...READ_ONLY_VIEW_CHAINS };
const MODULES = { ...WORKFLOW_MODULES, ...READ_ONLY_VIEW_MODULES };

/** @param {string} mod @param {object} chain */
function expandForModule(mod, chain) {
    const def = MODULES[mod];
    if (def?.pattern === 'read-only-view') {
        return expandReadOnlyViewChain(mod, chain);
    }
    return expandWorkflowChain(mod, chain);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const DEFAULT_LEGACY_ROOT = resolve(
    process.env.SEOS_LEGACY_ROOT ??
        '/Users/macbookair/Dev/Angular/cmz-backoffice-frontend'
);

/** @typedef {{ id: string; legacy: string; nx: string | null; chain_id: string; node: string; pattern: string; module: string; volet?: string; layer: string; status: string; oracle?: string[]; verified_at?: string; notes?: string; assumption_ref?: string }} CorpusPair */

const args = process.argv.slice(2);
const moduleName = args[0];
const verify = args.includes('--verify');
const oracleOnly =
    args.includes('--oracle-only') || process.env.CORPUS_ORACLE_ONLY === '1';
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

const moduleDef = MODULES[moduleName];
if (!moduleDef) {
    console.error(
        `Module inconnu: ${moduleName}. Disponibles: ${Object.keys(MODULES).join(', ')}`
    );
    process.exit(1);
}

/** @param {string} root @param {string | null} rel */
function existsAt(root, rel) {
    if (!rel) return false;
    return existsSync(join(root, rel));
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

/** @param {CorpusPair} pair @param {Set<string>} verifiedOracles */
function resolveStatus(pair, verifiedOracles) {
    if (pair.status === 'n/a') {
        return 'n/a';
    }

    if (!oracleOnly) {
        const legacyOk = existsAt(DEFAULT_LEGACY_ROOT, pair.legacy);
        if (!legacyOk) {
            return 'blocked';
        }
    }

    if (!pair.nx) {
        return pair.status === 'n/a' ? 'n/a' : 'pending';
    }

    const nxOk = existsAt(ROOT, pair.nx);
    if (!nxOk) {
        return 'pending';
    }

    if (!verify || !pair.oracle?.length) {
        return 'emitted';
    }

    const allOk = pair.oracle.every((o) => verifiedOracles.has(o));
    return allOk ? 'verified' : 'emitted';
}

/** @param {CorpusPair[]} pairs */
function emitPairs(pairs) {
    const verifiedOracles = new Set();

    if (verify) {
        const uniqueOracles = [
            ...new Set(pairs.flatMap((p) => p.oracle ?? [])),
        ];
        for (const oracle of uniqueOracles) {
            try {
                runOracle(oracle);
                verifiedOracles.add(oracle);
                console.error(`[oracle] ✓ ${oracle}`);
            } catch (err) {
                console.error(`[oracle] ✗ ${oracle}`);
            }
        }
    }

    const today = new Date().toISOString().slice(0, 10);

    return pairs.map((pair) => {
        const status = resolveStatus(pair, verifiedOracles);
        const out = {
            ...pair,
            status,
            nx: pair.nx ?? null,
        };
        if (status === 'verified') {
            out.verified_at = today;
        }
        if (status === 'blocked' && !out.notes) {
            out.notes = `Legacy introuvable: ${pair.legacy}`;
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
        `Legacy root: ${DEFAULT_LEGACY_ROOT}${oracleOnly ? ' (oracle-only, legacy ignoré)' : ''}`
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

/** @type {CorpusPair[]} */
const allPairs = [];
for (const chainId of chainIds) {
    allPairs.push(...expandForModule(moduleName, CHAINS[chainId]));
}

const resolved = emitPairs(allPairs);

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
