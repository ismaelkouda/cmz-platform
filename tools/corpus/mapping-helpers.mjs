/** Helpers + context workflow-action (split de mapping.mjs, plafond 800 l.). */
/**
 * Règles de mapping legacy → Nx par nœud IR (workflow-action, list_volet).
 *
 * Placeholders ctx : { module, volet, Volet }
 * {volet} = queues | tasks | all
 *
 * Oracle : `ensureBehavioralLevel` (audit H-1) ajoute `:test` dès que le
 * projet Nx déclare un target Vitest (chantier C).
 */

/** @typedef {{ legacy: (ctx: Ctx) => string; nx: (ctx: Ctx) => string | null; layer: string; oracle?: string[] | ((ctx: Ctx) => string[]); statusOverride?: string; notes?: string | ((ctx: Ctx) => string); assumption_ref?: string }} NodeMapping */

/** @typedef {{ module: string; volet: string; Volet: string }} Ctx */

const VOLET_PASCAL = {
    queues: 'Queues',
    tasks: 'Tasks',
    all: 'All',
    approve: 'Approve',
    evaluate: 'Evaluate',
    close: 'Close',
    reject: 'Reject',
    download: 'Download',
};

/** @param {string} module @param {string} volet @returns {Ctx} */
export function makeCtx(module, volet) {
    return {
        module,
        volet,
        Volet: VOLET_PASCAL[volet] ?? volet,
    };
}

/** Volet référence export / details dialog par module workflow-action. */
export function listExportRefVolet(module) {
    if (module === 'report-states') return 'approve';
    return 'queues';
}

/** @param {string} module @param {string} rel */
export function legacyPage(module, rel) {
    return `src/presentation/pages/${module}/${rel}`;
}

/** @param {string} module @param {string} rel */
export function legacyListExportPage(module, rel) {
    if (module === 'report-states') {
        return legacyPage(
            module,
            'presentation/features/approve/approve.component.ts'
        );
    }
    return legacyPage(module, rel);
}

/** @param {Ctx} ctx @param {string[] | ((ctx: Ctx) => string[])} oracle */
export function resolveOracle(ctx, oracle) {
    if (!oracle) return undefined;
    if (typeof oracle === 'function') return oracle(ctx);
    return oracle.map((target) =>
        target.replace(/@cmz\/processing-/g, `@cmz/${ctx.module}-`)
    );
}

/** @param {string[] | ((ctx: Ctx) => string[])} oracle */
export function moduleOracle(oracle) {
    return oracle;
}

/** @param {string} module */
export function modDetails(module) {
    return `${module}-details`;
}

/** @type {Record<string, NodeMapping>} */
