/**
 * Règles de mapping legacy → Nx (workflow-action) — façade.
 *
 * Corps découpé en packs ≤800 l. (`mapping-nodes-*.mjs`) + helpers.
 * API publique inchangée : makeCtx, NODE_MAPPINGS, expandChain.
 */
import { ensureBehavioralLevel } from './oracle-levels.mjs';
import { makeCtx, resolveOracle } from './mapping-helpers.mjs';
import { NODE_MAPPINGS_PACK_1 } from './mapping-nodes-1.mjs';
import { NODE_MAPPINGS_PACK_2 } from './mapping-nodes-2.mjs';
import { NODE_MAPPINGS_PACK_3 } from './mapping-nodes-3.mjs';
import { NODE_MAPPINGS_PACK_4 } from './mapping-nodes-4.mjs';

export { makeCtx } from './mapping-helpers.mjs';

/** @typedef { import('./mapping-helpers.mjs').NodeMapping } NodeMapping */
/** @typedef { import('./mapping-helpers.mjs').Ctx } Ctx */

/** @type {Record<string, import('./mapping-helpers.mjs').NodeMapping>} */
export const NODE_MAPPINGS = {
    ...NODE_MAPPINGS_PACK_1,
    ...NODE_MAPPINGS_PACK_2,
    ...NODE_MAPPINGS_PACK_3,
    ...NODE_MAPPINGS_PACK_4,
};

/** @param {import('./chains.mjs').ChainDef} chain @returns {string} */
function chainSegment(chain) {
    if (chain.volet) return chain.volet;
    if (chain.subgraph === 'details') return 'details';
    if (chain.subgraph === 'list_export') return 'export';
    if (chain.subgraph === 'tasks_actions') return 'tasks-actions';
    if (chain.subgraph === 'details_permissions') return 'permissions';
    if (chain.subgraph === 'details_qualification') return 'qualification';
    return 'shell';
}

/**
 * @param {string} module
 * @param {import('./chains.mjs').ChainDef} chain
 * @returns {import('./emit-pairs.mjs').CorpusPair[]}
 */
export function expandChain(module, chain) {
    const pattern = 'workflow-action';
    const pairs = [];
    const segment = chainSegment(chain);

    for (const node of chain.nodes) {
        const mapping = NODE_MAPPINGS[node];
        if (!mapping) {
            throw new Error(`Unknown node mapping: ${node}`);
        }

        const ctx = chain.volet
            ? makeCtx(module, chain.volet)
            : { module, volet: '', Volet: '' };
        const legacyPath = mapping.legacy(ctx);
        const nxPath = mapping.nx(ctx);
        const id = `${module}.${segment}.${node}`;
        const notes =
            typeof mapping.notes === 'function'
                ? mapping.notes(ctx)
                : mapping.notes;

        pairs.push({
            id,
            legacy: legacyPath,
            nx: nxPath,
            chain_id: chain.id,
            node,
            pattern,
            module,
            volet: chain.volet ?? undefined,
            layer: mapping.layer,
            status: mapping.statusOverride ?? 'pending',
            oracle: ensureBehavioralLevel(resolveOracle(ctx, mapping.oracle)),
            notes,
            assumption_ref: mapping.assumption_ref,
        });
    }

    return pairs;
}
