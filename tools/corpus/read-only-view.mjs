/**
 * Corpus read-only-view — monitoring + reporting + interactive-map (façade).
 * @see docs/architecture/patterns/read-only-view.pattern.json
 * @see docs/architecture/archetypes/read-only-view.md
 *
 * Découpé : shared (sections/helpers) + nodes + chaînes/expand ici.
 */
import { ensureBehavioralLevel } from './oracle-levels.mjs';
import {
    makeRovCtx,
    MONITORING_SECTIONS,
    REPORTING_SECTIONS,
    ROV_SECTION_VIEW_NODES,
    ROV_SHELL_NODES,
    INTERACTIVE_MAP_SHELL_NODES,
    ROV_MAP_VIEW_NODES,
    ROV_GIS_STUB_NODES,
    rovChainSegment,
} from './read-only-view-shared.mjs';
import { ROV_NODE_MAPPINGS } from './read-only-view-nodes.mjs';

export {
    makeRovCtx,
    MONITORING_SECTIONS,
    REPORTING_SECTIONS,
    ROV_SHELL_NODES,
    ROV_SECTION_VIEW_NODES,
    INTERACTIVE_MAP_SHELL_NODES,
    ROV_MAP_VIEW_NODES,
    ROV_GIS_STUB_NODES,
    ROV_NODE_MAPPINGS,
};

/** @param {string} module @param {string} section @param {string} description @param {Record<string, { legacyFolder: string; Section: string; facadeKebab: string }>} table @returns {RovChainDef} */
function viewChain(module, section, description, table) {
    return {
        id: `${module}.${section}.view`,
        description,
        subgraph: 'grafana_multi_section',
        section,
        nodes: ROV_SECTION_VIEW_NODES,
        threshold_emit: 0.8,
        threshold_close: 1.0,
        _sectionTable: table,
    };
}

/** @type {Record<string, RovChainDef>} */
export const READ_ONLY_VIEW_CHAINS = {
    'monitoring.node.view': viewChain(
        'monitoring',
        'node',
        'État traitement — embed Grafana',
        MONITORING_SECTIONS
    ),
    'monitoring.services.view': viewChain(
        'monitoring',
        'services',
        'État services — embed Grafana',
        MONITORING_SECTIONS
    ),
    'monitoring.resources.view': viewChain(
        'monitoring',
        'resources',
        'État ressources — embed Grafana',
        MONITORING_SECTIONS
    ),
    'monitoring.jobs.view': viewChain(
        'monitoring',
        'jobs',
        'Impact jobs — embed Grafana',
        MONITORING_SECTIONS
    ),
    'monitoring.module.shell': {
        id: 'monitoring.module.shell',
        description: 'Routes, endpoints, composition root, stack consolidé',
        nodes: ROV_SHELL_NODES,
        threshold_emit: 0.8,
        threshold_close: 1.0,
    },
    'reporting.report.view': viewChain(
        'reporting',
        'report',
        'Rapports — embed Grafana',
        REPORTING_SECTIONS
    ),
    'reporting.requests.view': viewChain(
        'reporting',
        'requests',
        'Demandes — embed Grafana',
        REPORTING_SECTIONS
    ),
    'reporting.report-by-channel.view': viewChain(
        'reporting',
        'report-by-channel',
        'Rapport par canal — embed Grafana',
        REPORTING_SECTIONS
    ),
    'reporting.report-by-operator.view': viewChain(
        'reporting',
        'report-by-operator',
        'Rapport par opérateur — embed Grafana',
        REPORTING_SECTIONS
    ),
    'reporting.module.shell': {
        id: 'reporting.module.shell',
        description: 'Routes, endpoints, composition root, stack consolidé',
        nodes: ROV_SHELL_NODES,
        threshold_emit: 0.8,
        threshold_close: 1.0,
    },
    'interactive-map.visualization.view': {
        id: 'interactive-map.visualization.view',
        description: 'Tableau de bord interactif — embed Grafana (mapLink)',
        subgraph: 'grafana_single_view',
        nodes: ROV_MAP_VIEW_NODES,
        threshold_emit: 0.8,
        threshold_close: 1.0,
    },
    'interactive-map.interactive.view': {
        id: 'interactive-map.interactive.view',
        description:
            'Carte SIG — legacy OpenLayers ; Nx = coquille statique v0',
        subgraph: 'gis_map_view',
        nodes: ROV_GIS_STUB_NODES,
        threshold_emit: 0.8,
        threshold_close: 1.0,
    },
    'interactive-map.module.shell': {
        id: 'interactive-map.module.shell',
        description: 'Routes, endpoints, composition root — stack MapEntity',
        nodes: INTERACTIVE_MAP_SHELL_NODES,
        threshold_emit: 0.8,
        threshold_close: 1.0,
    },
};

export const READ_ONLY_VIEW_MODULES = {
    monitoring: {
        pattern: 'read-only-view',
        legacyBase: 'src/presentation/pages/monitoring',
        chains: Object.keys(READ_ONLY_VIEW_CHAINS).filter((id) =>
            id.startsWith('monitoring.')
        ),
        reference_module: true,
    },
    reporting: {
        pattern: 'read-only-view',
        legacyBase: 'src/presentation/pages/reporting',
        chains: Object.keys(READ_ONLY_VIEW_CHAINS).filter((id) =>
            id.startsWith('reporting.')
        ),
        reference_module: false,
        promoted_from: 'monitoring',
    },
    'interactive-map': {
        pattern: 'read-only-view',
        legacyBase: 'src/presentation/pages/interactive-map',
        chains: Object.keys(READ_ONLY_VIEW_CHAINS).filter((id) =>
            id.startsWith('interactive-map.')
        ),
        partial: true,
    },
};

/**
 * @param {string} module
 * @param {RovChainDef} chain
 * @returns {import('./emit-pairs.mjs').CorpusPair[]}
 */
export function expandReadOnlyViewChain(module, chain) {
    const pattern = 'read-only-view';
    const pairs = [];
    const segment = rovChainSegment(chain);
    const sectionTable =
        chain._sectionTable ??
        (module === 'monitoring'
            ? MONITORING_SECTIONS
            : module === 'reporting'
              ? REPORTING_SECTIONS
              : undefined);

    for (const node of chain.nodes) {
        const mapping = ROV_NODE_MAPPINGS[node];
        if (!mapping) {
            throw new Error(`Unknown read-only-view node: ${node}`);
        }

        const ctx = chain.section
            ? makeRovCtx(module, chain.section, sectionTable)
            : {
                  module,
                  section: '',
                  Section: '',
                  legacyFolder: 'node',
                  facadeKebab: 'node',
              };

        const legacyPath =
            typeof mapping.legacy === 'function'
                ? mapping.legacy(ctx)
                : mapping.legacy;
        const nxPath =
            typeof mapping.nx === 'function' ? mapping.nx(ctx) : mapping.nx;
        const rawOracle =
            typeof mapping.oracle === 'function'
                ? mapping.oracle(ctx)
                : mapping.oracle?.map((t) =>
                      t.replace(/@cmz\/monitoring-/g, `@cmz/${module}-`)
                  );
        const oracle = ensureBehavioralLevel(rawOracle);
        const notes =
            typeof mapping.notes === 'function'
                ? mapping.notes(ctx)
                : mapping.notes;

        pairs.push({
            id: `${module}.${segment}.${node}`,
            legacy: legacyPath,
            nx: nxPath,
            chain_id: chain.id,
            node,
            pattern,
            module,
            section: chain.section ?? undefined,
            layer: mapping.layer,
            status: mapping.statusOverride ?? 'pending',
            oracle,
            notes,
            assumption_ref: mapping.assumption_ref,
        });
    }

    return pairs;
}
