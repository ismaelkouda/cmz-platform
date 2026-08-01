/**
 * Corpus read-only-view — monitoring + reporting (pattern v0).
 *
 * @see docs/architecture/patterns/read-only-view.pattern.json
 * @see docs/architecture/archetypes/read-only-view.md
 */

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
function legacyPage(module, rel) {
    return `src/presentation/pages/${module}/${rel}`;
}

/** @param {string} module @param {string} layer */
function modOracle(module, layer) {
    return [`@cmz/${module}-${layer}:build`];
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
function rovChainSegment(chain) {
    if (chain.section) return chain.section;
    return 'shell';
}

/** @param {string} module */
function mapperNxPath(module) {
    if (module === 'monitoring') {
        return 'libs/monitoring/data/src/lib/mappers/grafana-dashboard.mapper.ts';
    }
    return 'libs/reporting/data/src/lib/mappers/reporting-dashboard.mapper.ts';
}

/** @type {Record<string, import('./mapping.mjs').NodeMapping>} */
export const ROV_NODE_MAPPINGS = {
    'rov-view-entity': {
        legacy: ({ module }) =>
            legacyPage(module, 'domain/entities/node/node.entity.ts'),
        nx: ({ module }) =>
            `libs/${module}/domain/src/lib/entities/grafana-dashboard.entity.ts`,
        layer: 'domain',
        oracle: (ctx) => modOracle(ctx.module, 'domain'),
        notes: 'Legacy node entity représentatif — consolidation → GrafanaDashboardEntity',
    },
    'rov-section-enum': {
        legacy: ({ module }) =>
            legacyPage(module, 'domain/enums/node/node.enum.ts'),
        nx: ({ module }) =>
            `libs/${module}/domain/src/lib/enums/${module}-section.enum.ts`,
        layer: 'domain',
        oracle: (ctx) => modOracle(ctx.module, 'domain'),
        notes: 'Enum section — legacy éclaté ; Nx unifie MonitoringSection / ReportingSection',
    },
    'rov-repository-port': {
        legacy: ({ module }) =>
            legacyPage(module, 'domain/repositories/node/node.repository.ts'),
        nx: ({ module }) =>
            `libs/${module}/domain/src/lib/repositories/${module}.repository.ts`,
        layer: 'domain',
        oracle: (ctx) => modOracle(ctx.module, 'domain'),
    },
    'rov-variables-dto': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'infrastructure/api/dto/node/node-response-api.dto.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/data/src/lib/dtos/${module}-variables-response.dto.ts`,
        layer: 'data',
        oracle: (ctx) => modOracle(ctx.module, 'data'),
        notes: 'DTO wire unique regroupant tous les champs variables',
    },
    'rov-mapper': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'infrastructure/data/mappers/node/node.mapper.ts'
            ),
        nx: ({ module }) => mapperNxPath(module),
        layer: 'data',
        oracle: (ctx) => modOracle(ctx.module, 'data'),
    },
    'rov-api-source': {
        legacy: ({ module }) =>
            legacyPage(module, 'infrastructure/data/sources/node/node.api.ts'),
        nx: ({ module }) =>
            `libs/${module}/data/src/lib/sources/${module}.api.ts`,
        layer: 'data',
        oracle: (ctx) => modOracle(ctx.module, 'data'),
    },
    'rov-repository-impl': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'infrastructure/data/repositories/node/node.repository.impl.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/data/src/lib/repositories/${module}.repository.impl.ts`,
        layer: 'data',
        oracle: (ctx) => modOracle(ctx.module, 'data'),
    },
    'rov-use-case': {
        legacy: ({ module }) =>
            legacyPage(module, 'application/use-cases/node/node.use-case.ts'),
        nx: ({ module }) =>
            `libs/${module}/application/src/lib/use-cases/${module}.use-case.ts`,
        layer: 'application',
        oracle: (ctx) => modOracle(ctx.module, 'application'),
    },
    'module-routes-legacy': {
        legacy: ({ module }) => legacyPage(module, `${module}.routes.ts`),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        notes: (ctx) => `Routes migrées vers libs/${ctx.module}/ui`,
    },
    'module-routes-nx': {
        legacy: ({ module }) => legacyPage(module, `${module}.routes.ts`),
        nx: ({ module }) =>
            `libs/${module}/ui/src/lib/features/${module}.routes.ts`,
        layer: 'ui',
        oracle: (ctx) => modOracle(ctx.module, 'ui'),
    },
    'module-endpoints': {
        legacy: ({ module }) =>
            legacyPage(module, `infrastructure/api/${module}.endpoints.ts`),
        nx: ({ module }) =>
            `libs/${module}/data/src/lib/endpoints/${module}.endpoints.ts`,
        layer: 'data',
        oracle: (ctx) => modOracle(ctx.module, 'data'),
    },
    'module-providers-nx': {
        legacy: ({ module }) => legacyPage(module, `di/${module}.providers.ts`),
        nx: ({ module }) =>
            `apps/backoffice-angular/src/app/providers/${module}.providers.ts`,
        layer: 'app',
        oracle: (ctx) => [
            ...modOracle(ctx.module, 'domain'),
            ...modOracle(ctx.module, 'data'),
            ...modOracle(ctx.module, 'application'),
        ],
        notes: 'Oracle Tier 1 module — backoffice-angular:build = Tier 2 intégration',
        assumption_ref: 'A-2026-07-30-08',
    },
    'module-providers-legacy': {
        legacy: ({ module }) => legacyPage(module, `di/${module}.providers.ts`),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        notes: 'DI module → composition root app en Nx',
    },
    'rov-shared-grafana-embed': {
        legacy: () =>
            'src/shared/components/dashboard-viewer/dashboard-viewer.component.ts',
        nx: () =>
            'libs/shared/ui/src/lib/components/grafana-embed/grafana-embed.component.ts',
        layer: 'ui',
        oracle: (ctx) => modOracle(ctx.module, 'ui'),
        notes: 'Legacy DashboardViewer → GrafanaEmbedComponent @cmz/shared-ui',
    },
    'rov-shared-resource-facade': {
        legacy: ({ module }) =>
            legacyPage(module, 'application/services/node/node.facade.ts'),
        nx: () => 'libs/shared/application/src/lib/facades/resource.facade.ts',
        layer: 'application',
        oracle: (ctx) => modOracle(ctx.module, 'application'),
        notes: 'ResourceFacade kernel — pattern read-only-view',
    },
    'rov-section-legacy-entity': {
        legacy: ({ module, legacyFolder }) =>
            legacyPage(
                module,
                `domain/entities/${legacyFolder}/${legacyFolder}.entity.ts`
            ),
        nx: ({ module }) =>
            `libs/${module}/domain/src/lib/entities/grafana-dashboard.entity.ts`,
        layer: 'domain',
        oracle: (ctx) => modOracle(ctx.module, 'domain'),
        notes: 'Consolidation N× verticals → 1 GrafanaDashboardEntity',
    },
    'rov-section-legacy-repository': {
        legacy: ({ module, legacyFolder }) =>
            legacyPage(
                module,
                `domain/repositories/${legacyFolder}/${legacyFolder}.repository.ts`
            ),
        nx: ({ module }) =>
            `libs/${module}/domain/src/lib/repositories/${module}.repository.ts`,
        layer: 'domain',
        oracle: (ctx) => modOracle(ctx.module, 'domain'),
        notes: 'Port unique paramétré par section',
    },
    'rov-section-legacy-mapper': {
        legacy: ({ module, legacyFolder }) =>
            legacyPage(
                module,
                `infrastructure/data/mappers/${legacyFolder}/${legacyFolder}.mapper.ts`
            ),
        nx: ({ module }) => mapperNxPath(module),
        layer: 'data',
        oracle: (ctx) => modOracle(ctx.module, 'data'),
    },
    'rov-section-legacy-api': {
        legacy: ({ module, legacyFolder }) =>
            legacyPage(
                module,
                `infrastructure/data/sources/${legacyFolder}/${legacyFolder}.api.ts`
            ),
        nx: ({ module }) =>
            `libs/${module}/data/src/lib/sources/${module}.api.ts`,
        layer: 'data',
        oracle: (ctx) => modOracle(ctx.module, 'data'),
    },
    'rov-section-legacy-use-case': {
        legacy: ({ module, legacyFolder }) =>
            legacyPage(
                module,
                `application/use-cases/${legacyFolder}/${legacyFolder}.use-case.ts`
            ),
        nx: ({ module }) =>
            `libs/${module}/application/src/lib/use-cases/${module}.use-case.ts`,
        layer: 'application',
        oracle: (ctx) => modOracle(ctx.module, 'application'),
    },
    'rov-section-legacy-facade': {
        legacy: ({ module, legacyFolder }) =>
            legacyPage(
                module,
                `application/services/${legacyFolder}/${legacyFolder}.facade.ts`
            ),
        nx: ({ module, facadeKebab }) =>
            `libs/${module}/application/src/lib/facades/${facadeKebab}.facade.ts`,
        layer: 'application',
        oracle: (ctx) => modOracle(ctx.module, 'application'),
    },
    'rov-section-legacy-page': {
        legacy: ({ module, legacyFolder }) =>
            legacyPage(
                module,
                `presentation/features/${legacyFolder}/${legacyFolder}.component.ts`
            ),
        nx: ({ module, facadeKebab }) =>
            `libs/${module}/ui/src/lib/features/${facadeKebab}-page.component.ts`,
        layer: 'ui',
        oracle: (ctx) => modOracle(ctx.module, 'ui'),
        notes: 'Page mince → cmz-grafana-embed',
    },
    'rov-section-query-legacy': {
        legacy: ({ module, legacyFolder }) =>
            legacyPage(
                module,
                `application/queries/${legacyFolder}/${legacyFolder}.query.ts`
            ),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        assumption_ref: 'A-2026-07-30-05',
    },
    'rov-section-query-handler-legacy': {
        legacy: ({ module, legacyFolder }) =>
            legacyPage(
                module,
                `application/queries-handlers/${legacyFolder}/${legacyFolder}.handler.ts`
            ),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        assumption_ref: 'A-2026-07-30-05',
    },
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
        (module === 'monitoring' ? MONITORING_SECTIONS : REPORTING_SECTIONS);

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
        const oracle =
            typeof mapping.oracle === 'function'
                ? mapping.oracle(ctx)
                : mapping.oracle?.map((t) =>
                      t.replace(/@cmz\/monitoring-/g, `@cmz/${module}-`)
                  );
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
