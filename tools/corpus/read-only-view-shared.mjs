/** Données + helpers read-only-view partagés (plafond 800 l.). */
/**
 * Corpus read-only-view — monitoring + reporting (pattern v0).
 *
 * @see docs/architecture/patterns/read-only-view.pattern.json
 * @see docs/architecture/archetypes/read-only-view.md
 */

import { ensureBehavioralLevel, layerOracles } from './oracle-levels.mjs';

/** @typedef {{ id: string; description: string; subgraph?: string; section?: string; nodes: string[]; threshold_emit?: number; threshold_close?: number }} RovChainDef */

/** @typedef {{ module: string; section: string; Section: string; legacyFolder: string; facadeKebab: string }} RovCtx */

const MODULE_SHELL_NODES = [
    'module-routes-legacy',
    'module-routes-nx',
    'module-endpoints',
    'module-providers-nx',
    'module-providers-legacy',
];

export const ROV_SHELL_NODES = [
    'rov-view-entity',
    'rov-section-enum',
    'rov-repository-port',
    'rov-variables-dto',
    'rov-mapper',
    'rov-api-source',
    'rov-repository-impl',
    'rov-use-case',
    ...MODULE_SHELL_NODES,
    'rov-shared-grafana-embed',
    'rov-shared-resource-facade',
];

export const ROV_SECTION_VIEW_NODES = [
    'rov-section-legacy-entity',
    'rov-section-legacy-repository',
    'rov-section-legacy-mapper',
    'rov-section-legacy-api',
    'rov-section-legacy-use-case',
    'rov-section-legacy-facade',
    'rov-section-legacy-page',
    'rov-section-query-legacy',
    'rov-section-query-handler-legacy',
];

/** @type {Record<string, { legacyFolder: string; Section: string; facadeKebab: string }>} */
export const MONITORING_SECTIONS = {
    node: { legacyFolder: 'node', Section: 'Node', facadeKebab: 'node' },
    services: {
        legacyFolder: 'services',
        Section: 'Services',
        facadeKebab: 'services',
    },
    resources: {
        legacyFolder: 'resources',
        Section: 'Resources',
        facadeKebab: 'resources',
    },
    jobs: { legacyFolder: 'jobs', Section: 'Jobs', facadeKebab: 'jobs' },
};

/** @type {Record<string, { legacyFolder: string; Section: string; facadeKebab: string }>} */
export const REPORTING_SECTIONS = {
    report: {
        legacyFolder: 'reports',
        Section: 'Report',
        facadeKebab: 'report',
    },
    requests: {
        legacyFolder: 'requests',
        Section: 'Requests',
        facadeKebab: 'requests',
    },
    'report-by-channel': {
        legacyFolder: 'report-by-channel',
        Section: 'ReportByChannel',
        facadeKebab: 'report-by-channel',
    },
    'report-by-operator': {
        legacyFolder: 'report-by-operator',
        Section: 'ReportByOperator',
        facadeKebab: 'report-by-operator',
    },
};

/** @param {string} module @param {string} rel */
export function legacyPage(module, rel) {
    return `src/presentation/pages/${module}/${rel}`;
}

/** @param {string} module @param {string} layer */
export function modOracle(module, layer) {
    return layerOracles(module, layer);
}

/** @param {string} module @param {string} section @param {Record<string, { legacyFolder: string; Section: string; facadeKebab: string }>} table @returns {RovCtx} */
export function makeRovCtx(module, section, table) {
    const meta = table[section];
    if (!meta) {
        throw new Error(`Section inconnue ${section} pour ${module}`);
    }
    return { module, section, ...meta };
}

/** @param {RovChainDef} chain @returns {string} */
export function rovChainSegment(chain) {
    if (chain.section) return chain.section;
    return 'shell';
}

/** @param {string} module */
export function mapperNxPath(module) {
    if (module === 'monitoring') {
        return 'libs/monitoring/data/src/lib/mappers/grafana-dashboard.mapper.ts';
    }
    if (module === 'interactive-map') {
        return 'libs/interactive-map/data/src/lib/mappers/map.mapper.ts';
    }
    return 'libs/reporting/data/src/lib/mappers/reporting-dashboard.mapper.ts';
}

/** @param {string} module */
export function viewEntityNxPath(module) {
    if (module === 'interactive-map') {
        return 'libs/interactive-map/domain/src/lib/entities/map.entity.ts';
    }
    return `libs/${module}/domain/src/lib/entities/grafana-dashboard.entity.ts`;
}

/** @param {string} module */
export function variablesDtoNxPath(module) {
    if (module === 'interactive-map') {
        return 'libs/interactive-map/data/src/lib/dtos/map-response.dto.ts';
    }
    return `libs/${module}/data/src/lib/dtos/${module}-variables-response.dto.ts`;
}

/** @param {string} module */
export function apiSourceNxPath(module) {
    if (module === 'interactive-map') {
        return 'libs/interactive-map/data/src/lib/sources/map.api.ts';
    }
    return `libs/${module}/data/src/lib/sources/${module}.api.ts`;
}

/** @param {string} module */
export function useCaseNxPath(module) {
    if (module === 'interactive-map') {
        return 'libs/interactive-map/application/src/lib/use-cases/map.use-case.ts';
    }
    return `libs/${module}/application/src/lib/use-cases/${module}.use-case.ts`;
}

export const INTERACTIVE_MAP_SHELL_NODES = [
    'rov-view-entity',
    'rov-repository-port',
    'rov-variables-dto',
    'rov-mapper',
    'rov-api-source',
    'rov-repository-impl',
    'rov-use-case',
    ...MODULE_SHELL_NODES,
    'rov-shared-grafana-embed',
    'rov-shared-resource-facade',
];

export const ROV_MAP_VIEW_NODES = [
    'rov-map-legacy-entity',
    'rov-map-legacy-repository',
    'rov-map-legacy-dto',
    'rov-map-legacy-mapper',
    'rov-map-legacy-api',
    'rov-map-legacy-use-case',
    'rov-map-legacy-facade',
    'rov-map-legacy-page',
    'rov-map-query-legacy',
    'rov-map-query-handler-legacy',
];

export const ROV_GIS_STUB_NODES = [
    'rov-gis-legacy-page',
    'rov-gis-legacy-facade',
    'rov-gis-legacy-store',
    'rov-gis-legacy-adapter',
];

/** @type {Record<string, import('./mapping.mjs').NodeMapping>} */
