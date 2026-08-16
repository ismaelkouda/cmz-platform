/**
 * H-5 / T2-7 — construction de `oracle_report` (evidence horodatée).
 *
 * Séparation contractuelle Big Tech :
 * - `oracle` (string[]) = **intent** (quelles cibles Nx la paire déclare)
 * - `oracle_report` = **evidence** (build/lint/test + mode + horodatage)
 *
 * `strict_templates` reste `not_run` en Tier 1 module (émission corpus) —
 * réservé au Tier 2 (`check:tier2` / nightly), documenté explicitement.
 *
 * @see docs/architecture/corpus/pair.schema.json#/$defs/oracleReport
 * @see docs/architecture/audit-workspace-2026-08-02.md (H-5)
 */

/**
 * @typedef {{ task: string; ok: boolean; detail: string; skipped?: boolean }} GateTaskResult
 * @typedef {{ ok: boolean; results: GateTaskResult[] }} ModuleGateResult
 * @typedef {{
 *   status: 'pass' | 'fail' | 'skip' | 'not_run';
 *   at?: string;
 *   targets?: string[];
 *   detail?: string;
 * }} OracleCheck
 * @typedef {{
 *   ran_at: string;
 *   mode: 'structural-only' | 'full';
 *   build: OracleCheck;
 *   lint: OracleCheck;
 *   test: OracleCheck;
 *   strict_templates: OracleCheck;
 *   pair_targets?: { verified: string[]; failed: string[] };
 *   levels?: { structural: number; behavioral: number; other: number };
 * }} OracleReport
 */

/**
 * @param {GateTaskResult[] | undefined} gateResults
 * @param {string} task
 * @param {string} at
 * @returns {OracleCheck}
 */
export function checkFromGate(gateResults, task, at) {
    const r = gateResults?.find((x) => x.task === task);
    if (!r) {
        return {
            status: 'not_run',
            at,
            detail: `gate task « ${task} » absent`,
        };
    }
    if (r.skipped) {
        return { status: 'skip', at, detail: r.detail };
    }
    return {
        status: r.ok ? 'pass' : 'fail',
        at,
        detail: r.detail,
    };
}

/**
 * @param {string[]} targets
 * @param {Set<string>} verifiedOracles
 * @returns {{ verified: string[]; failed: string[] }}
 */
export function partitionPairTargets(targets, verifiedOracles) {
    const verified = [];
    const failed = [];
    for (const t of targets) {
        if (verifiedOracles.has(t)) verified.push(t);
        else failed.push(t);
    }
    return { verified, failed };
}

/**
 * Construit le rapport oracle pour une paire (emit --verify).
 *
 * @param {object} args
 * @param {boolean} args.structuralOnly
 * @param {ModuleGateResult | null | undefined} args.gate
 * @param {string[] | undefined} args.pairOracle
 * @param {Set<string>} args.verifiedOracles
 * @param {{ structural?: number; behavioral?: number; other?: number } | undefined} args.levels
 * @param {string} [args.ranAt]
 * @returns {OracleReport}
 */
export function buildOracleReport({
    structuralOnly,
    gate,
    pairOracle,
    verifiedOracles,
    levels,
    ranAt = new Date().toISOString(),
}) {
    const targets = pairOracle ?? [];
    const pair_targets = partitionPairTargets(targets, verifiedOracles);

    /** @type {OracleReport} */
    const report = {
        ran_at: ranAt,
        mode: structuralOnly ? 'structural-only' : 'full',
        build: checkFromGate(gate?.results, 'build', ranAt),
        lint: checkFromGate(gate?.results, 'lint', ranAt),
        test: checkFromGate(gate?.results, 'test', ranAt),
        strict_templates: {
            status: 'not_run',
            at: ranAt,
            detail: 'Tier 2 only — `bun run check:tier2` / nightly-integration (H-5)',
        },
    };

    if (targets.length > 0) {
        report.pair_targets = pair_targets;
        // Enrich build/test checks with this pair's targets (intent + evidence).
        const buildTargets = targets.filter((t) => t.endsWith(':build'));
        const testTargets = targets.filter((t) => t.endsWith(':test'));
        if (buildTargets.length) {
            report.build = {
                ...report.build,
                targets: buildTargets,
            };
        }
        if (testTargets.length) {
            report.test = {
                ...report.test,
                targets: testTargets,
            };
        }
    }

    if (levels) {
        report.levels = {
            structural: levels.structural ?? 0,
            behavioral: levels.behavioral ?? 0,
            other: levels.other ?? 0,
        };
    }

    return report;
}

/**
 * Vérifie structurellement un oracle_report (sans Ajv — smoke offline).
 * Retourne une liste d'erreurs ; vide = OK.
 * @param {unknown} report
 * @returns {string[]}
 */
export function assertOracleReportShape(report) {
    /** @type {string[]} */
    const errors = [];
    if (!report || typeof report !== 'object') {
        return ['oracle_report must be an object'];
    }
    /** @type {Record<string, unknown>} */
    const r = /** @type {Record<string, unknown>} */ (report);
    for (const key of [
        'ran_at',
        'mode',
        'build',
        'lint',
        'test',
        'strict_templates',
    ]) {
        if (!(key in r)) errors.push(`missing ${key}`);
    }
    if (r.mode !== 'structural-only' && r.mode !== 'full') {
        errors.push(`mode invalid: ${String(r.mode)}`);
    }
    const statuses = new Set(['pass', 'fail', 'skip', 'not_run']);
    for (const k of ['build', 'lint', 'test', 'strict_templates']) {
        const c = r[k];
        if (!c || typeof c !== 'object') {
            errors.push(`${k} must be object`);
            continue;
        }
        const st = /** @type {{ status?: string }} */ (c).status;
        if (!statuses.has(/** @type {string} */ (st))) {
            errors.push(`${k}.status invalid: ${String(st)}`);
        }
    }
    return errors;
}
