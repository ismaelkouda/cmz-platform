/**
 * Corpus aggregated-stats-view — module `dashboard` (sous-famille read-only-view).
 *
 * Objet agrégé unique + filtre période + ResourceFacade — distinct des embeds Grafana.
 *
 * @see docs/architecture/patterns/read-only-view.pattern.json — subgraph aggregated_stats_view
 * @see docs/architecture/module-dashboard.md
 */

import { ensureBehavioralLevel, layerOracles } from './oracle-levels.mjs';

const MODULE = 'dashboard';

const MODULE_SHELL_NODES = [
    'dash-module-routes-legacy',
    'dash-module-routes-nx',
    'dash-module-endpoints',
    'dash-module-providers-nx',
    'dash-module-providers-legacy',
];

export const DASHBOARD_VIEW_NODES = [
    'dash-legacy-entity',
    'dash-legacy-repository',
    'dash-legacy-filter-vo',
    'dash-legacy-period',
    'dash-legacy-response-dto',
    'dash-legacy-filter-dto',
    'dash-legacy-mapper',
    'dash-legacy-filter-mapper',
    'dash-legacy-api',
    'dash-legacy-repository-impl',
    'dash-legacy-use-case',
    'dash-legacy-facade',
    'dash-legacy-page',
    'dash-legacy-skeleton',
    'dash-legacy-filter-store',
    'dash-legacy-vm-presenter',
    'dash-query-legacy',
    'dash-query-handler-legacy',
    'dash-query-bus-legacy',
];

export const DASHBOARD_SHELL_NODES = [
    'dash-shared-resource-facade',
    ...MODULE_SHELL_NODES,
];

/** @param {string} rel */
function legacyPage(rel) {
    return `src/presentation/pages/${MODULE}/${rel}`;
}

/** @param {string} layer */
function modOracle(layer) {
    return layerOracles(MODULE, layer);
}

/** @type {Record<string, import('./mapping.mjs').NodeMapping>} */
export const DASHBOARD_NODE_MAPPINGS = {
    'dash-legacy-entity': {
        legacy: () => legacyPage('domain/entities/dashboard.entity.ts'),
        nx: () => 'libs/dashboard/domain/src/lib/entities/dashboard.entity.ts',
        layer: 'domain',
        oracle: () => modOracle('domain'),
    },
    'dash-legacy-repository': {
        legacy: () => legacyPage('domain/repositories/dashboard.repository.ts'),
        nx: () =>
            'libs/dashboard/domain/src/lib/repositories/dashboard.repository.ts',
        layer: 'domain',
        oracle: () => modOracle('domain'),
    },
    'dash-legacy-filter-vo': {
        legacy: () => legacyPage('domain/value-objects/dashboard-filter.vo.ts'),
        nx: () =>
            'libs/dashboard/domain/src/lib/value-objects/dashboard-filter.vo.ts',
        layer: 'domain',
        oracle: () => modOracle('domain'),
        notes: 'Legacy dashboard-filter.entity.ts fusionné en VO Nx',
    },
    'dash-legacy-period': {
        legacy: () => legacyPage('domain/constants/period.const.ts'),
        nx: () => 'libs/dashboard/domain/src/lib/enums/period.enum.ts',
        layer: 'domain',
        oracle: () => modOracle('domain'),
        notes: 'Period wire-first — validation InvalidPeriodError',
    },
    'dash-legacy-response-dto': {
        legacy: () =>
            legacyPage('infrastructure/api/dto/dashboard-response-api.dto.ts'),
        nx: () =>
            'libs/dashboard/data/src/lib/dtos/dashboard-response-api.dto.ts',
        layer: 'data',
        oracle: () => modOracle('data'),
    },
    'dash-legacy-filter-dto': {
        legacy: () =>
            legacyPage('infrastructure/api/dto/dashboard-filter-api.dto.ts'),
        nx: () =>
            'libs/dashboard/data/src/lib/dtos/dashboard-filter-api.dto.ts',
        layer: 'data',
        oracle: () => modOracle('data'),
    },
    'dash-legacy-mapper': {
        legacy: () =>
            legacyPage('infrastructure/data/mappers/dashboard.mapper.ts'),
        nx: () => 'libs/dashboard/data/src/lib/mappers/dashboard.mapper.ts',
        layer: 'data',
        oracle: () => modOracle('data'),
        notes: 'Correction décalage totalReportsInProcessing / Rejected',
    },
    'dash-legacy-filter-mapper': {
        legacy: () =>
            legacyPage(
                'infrastructure/data/mappers/dashboard-filter.mapper.ts'
            ),
        nx: () =>
            'libs/dashboard/data/src/lib/mappers/dashboard-filter.mapper.ts',
        layer: 'data',
        oracle: () => modOracle('data'),
    },
    'dash-legacy-api': {
        legacy: () =>
            legacyPage('infrastructure/data/sources/dashboard.api.ts'),
        nx: () => 'libs/dashboard/data/src/lib/sources/dashboard.api.ts',
        layer: 'data',
        oracle: () => modOracle('data'),
    },
    'dash-legacy-repository-impl': {
        legacy: () =>
            legacyPage(
                'infrastructure/data/repositories/dashboard-repository.impl.ts'
            ),
        nx: () =>
            'libs/dashboard/data/src/lib/repositories/dashboard.repository.impl.ts',
        layer: 'data',
        oracle: () => modOracle('data'),
    },
    'dash-legacy-use-case': {
        legacy: () => legacyPage('application/use-cases/dashboard.use-case.ts'),
        nx: () =>
            'libs/dashboard/application/src/lib/use-cases/dashboard.use-case.ts',
        layer: 'application',
        oracle: () => modOracle('application'),
        notes: 'defer + DashboardFilterVo — sans CQRS bus',
    },
    'dash-legacy-facade': {
        legacy: () => legacyPage('application/services/dashboard.facade.ts'),
        nx: () =>
            'libs/dashboard/application/src/lib/facades/dashboard.facade.ts',
        layer: 'application',
        oracle: () => modOracle('application'),
    },
    'dash-legacy-page': {
        legacy: () =>
            legacyPage(
                'presentation/dahsboard-page/dashboard-page.component.ts'
            ),
        nx: () =>
            'libs/dashboard/ui/src/lib/features/dashboard-page.component.ts',
        layer: 'ui',
        oracle: () => modOracle('ui'),
        notes: 'Typo legacy dahsboard-page — chemin source conservé',
    },
    'dash-legacy-skeleton': {
        legacy: () =>
            legacyPage(
                'presentation/dashboard-skeleton/dashboard-skeleton.component.ts'
            ),
        nx: () =>
            'libs/dashboard/ui/src/lib/features/dashboard-skeleton.component.ts',
        layer: 'ui',
        oracle: () => modOracle('ui'),
        notes: '1er skeleton monorepo — Tailwind animate-pulse',
    },
    'dash-legacy-filter-store': {
        legacy: () => null,
        nx: () => 'libs/dashboard/ui/src/lib/stores/dashboard-filter.store.ts',
        layer: 'ui',
        oracle: () => modOracle('ui'),
        statusOverride: 'n/a',
        notes: 'Nx-only — filtre période UI (exception aggregated_stats_view)',
    },
    'dash-legacy-vm-presenter': {
        legacy: () => null,
        nx: () =>
            'libs/dashboard/ui/src/lib/adapters/dashboard-vm.presenter.ts',
        layer: 'ui',
        oracle: () => modOracle('ui'),
        statusOverride: 'n/a',
        notes: 'Nx-only — projection cartes (exception aggregated_stats_view)',
    },
    'dash-query-legacy': {
        legacy: () => legacyPage('application/queries/dashboard.query.ts'),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        assumption_ref: 'A-2026-07-30-05',
    },
    'dash-query-handler-legacy': {
        legacy: () =>
            legacyPage('application/queries-handlers/dashboard.handler.ts'),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        assumption_ref: 'A-2026-07-30-05',
    },
    'dash-query-bus-legacy': {
        legacy: () => legacyPage('application/queries-bus/dashboard.bus.ts'),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        assumption_ref: 'A-2026-07-30-05',
    },
    'dash-shared-resource-facade': {
        legacy: () => legacyPage('application/services/dashboard.facade.ts'),
        nx: () => 'libs/shared/application/src/lib/facades/resource.facade.ts',
        layer: 'application',
        oracle: () => modOracle('application'),
        notes: 'DashboardFacade extends ResourceFacade kernel',
    },
    'dash-module-routes-legacy': {
        legacy: () => legacyPage('dashboard.routes.ts'),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        notes: 'Routes migrées vers libs/dashboard/ui',
    },
    'dash-module-routes-nx': {
        legacy: () => legacyPage('dashboard.routes.ts'),
        nx: () => 'libs/dashboard/ui/src/lib/features/dashboard.routes.ts',
        layer: 'ui',
        oracle: () => modOracle('ui'),
    },
    'dash-module-endpoints': {
        legacy: () => legacyPage('infrastructure/api/dashboard.endpoints.ts'),
        nx: () =>
            'libs/dashboard/data/src/lib/endpoints/dashboard.endpoints.ts',
        layer: 'data',
        oracle: () => modOracle('data'),
    },
    'dash-module-providers-nx': {
        legacy: () => legacyPage('di/dashboard.providers.ts'),
        nx: () =>
            'apps/backoffice-angular/src/app/providers/dashboard.providers.ts',
        layer: 'app',
        oracle: () => [
            ...modOracle('domain'),
            ...modOracle('data'),
            ...modOracle('application'),
        ],
        assumption_ref: 'A-2026-07-30-08',
    },
    'dash-module-providers-legacy': {
        legacy: () => legacyPage('di/dashboard.providers.ts'),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
    },
};

/** @type {Record<string, import('./read-only-view.mjs').RovChainDef>} */
export const DASHBOARD_CHAINS = {
    'dashboard.view': {
        id: 'dashboard.view',
        description: 'Tableau de bord agrégé — statistiques + filtre période',
        subgraph: 'aggregated_stats_view',
        nodes: DASHBOARD_VIEW_NODES,
        threshold_emit: 0.8,
        threshold_close: 1.0,
    },
    'dashboard.module.shell': {
        id: 'dashboard.module.shell',
        description: 'Routes, endpoints, composition root',
        nodes: DASHBOARD_SHELL_NODES,
        threshold_emit: 0.8,
        threshold_close: 1.0,
    },
};

export const DASHBOARD_MODULES = {
    dashboard: {
        pattern: 'aggregated-stats-view',
        legacyBase: 'src/presentation/pages/dashboard',
        chains: Object.keys(DASHBOARD_CHAINS),
        reference_module: true,
    },
};

/**
 * @param {string} module
 * @param {import('./read-only-view.mjs').RovChainDef} chain
 * @returns {import('./emit-pairs.mjs').CorpusPair[]}
 */
export function expandDashboardChain(module, chain) {
    const pattern = 'aggregated-stats-view';
    const pairs = [];
    const segment = chain.id.endsWith('.module.shell') ? 'shell' : 'view';

    for (const node of chain.nodes) {
        const mapping = DASHBOARD_NODE_MAPPINGS[node];
        if (!mapping) {
            throw new Error(`Unknown dashboard node: ${node}`);
        }

        const legacyPath =
            typeof mapping.legacy === 'function'
                ? mapping.legacy({ module })
                : mapping.legacy;
        const nxPath =
            typeof mapping.nx === 'function'
                ? mapping.nx({ module })
                : mapping.nx;
        const oracle = ensureBehavioralLevel(
            typeof mapping.oracle === 'function'
                ? mapping.oracle({ module })
                : mapping.oracle
        );
        const notes =
            typeof mapping.notes === 'function'
                ? mapping.notes({ module })
                : mapping.notes;

        pairs.push({
            id: `${module}.${segment}.${node}`,
            legacy: legacyPath,
            nx: nxPath,
            chain_id: chain.id,
            node,
            pattern,
            module,
            layer: mapping.layer,
            status: mapping.statusOverride ?? 'pending',
            oracle,
            notes,
            assumption_ref: mapping.assumption_ref,
        });
    }

    return pairs;
}
