/**
 * ROV_NODE_MAPPINGS — nœuds IR read-only-view (plafond 800 l.).
 */
import {
    legacyPage,
    mapperNxPath,
    viewEntityNxPath,
    variablesDtoNxPath,
    apiSourceNxPath,
    useCaseNxPath,
    modOracle,
} from './read-only-view-shared.mjs';

/** @type {Record<string, import('./mapping.mjs').NodeMapping>} */
export const ROV_NODE_MAPPINGS = {
    'rov-view-entity': {
        legacy: ({ module }) =>
            module === 'interactive-map'
                ? legacyPage(module, 'domain/entities/map/map.entity.ts')
                : legacyPage(module, 'domain/entities/node/node.entity.ts'),
        nx: ({ module }) => viewEntityNxPath(module),
        layer: 'domain',
        oracle: (ctx) => modOracle(ctx.module, 'domain'),
        notes: ({ module }) =>
            module === 'interactive-map'
                ? 'MapEntity(grafanaLink) — sous-graphe grafana_single_view'
                : 'Legacy node entity représentatif — consolidation → GrafanaDashboardEntity',
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
            module === 'interactive-map'
                ? legacyPage(
                      module,
                      'domain/repositories/map-repository.interface.ts'
                  )
                : legacyPage(
                      module,
                      'domain/repositories/node/node.repository.ts'
                  ),
        nx: ({ module }) =>
            `libs/${module}/domain/src/lib/repositories/${module}.repository.ts`,
        layer: 'domain',
        oracle: (ctx) => modOracle(ctx.module, 'domain'),
    },
    'rov-variables-dto': {
        legacy: ({ module }) =>
            module === 'interactive-map'
                ? legacyPage(
                      module,
                      'infrastructure/api/dto/map/map-response.dto.ts'
                  )
                : legacyPage(
                      module,
                      'infrastructure/api/dto/node/node-response-api.dto.ts'
                  ),
        nx: ({ module }) => variablesDtoNxPath(module),
        layer: 'data',
        oracle: (ctx) => modOracle(ctx.module, 'data'),
        notes: 'DTO wire unique regroupant tous les champs variables',
    },
    'rov-mapper': {
        legacy: ({ module }) =>
            module === 'interactive-map'
                ? legacyPage(
                      module,
                      'infrastructure/data/mappers/map.mapper.ts'
                  )
                : legacyPage(
                      module,
                      'infrastructure/data/mappers/node/node.mapper.ts'
                  ),
        nx: ({ module }) => mapperNxPath(module),
        layer: 'data',
        oracle: (ctx) => modOracle(ctx.module, 'data'),
    },
    'rov-api-source': {
        legacy: ({ module }) =>
            module === 'interactive-map'
                ? legacyPage(module, 'infrastructure/data/sources/map.api.ts')
                : legacyPage(
                      module,
                      'infrastructure/data/sources/node/node.api.ts'
                  ),
        nx: ({ module }) => apiSourceNxPath(module),
        layer: 'data',
        oracle: (ctx) => modOracle(ctx.module, 'data'),
    },
    'rov-repository-impl': {
        legacy: ({ module }) =>
            module === 'interactive-map'
                ? legacyPage(
                      module,
                      'infrastructure/repositories/map.repository.impl.ts'
                  )
                : legacyPage(
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
            module === 'interactive-map'
                ? legacyPage(
                      module,
                      'application/use-cases/map/map.use-case.ts'
                  )
                : legacyPage(
                      module,
                      'application/use-cases/node/node.use-case.ts'
                  ),
        nx: ({ module }) => useCaseNxPath(module),
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
            module === 'interactive-map'
                ? legacyPage(module, 'application/services/map.facade.ts')
                : legacyPage(
                      module,
                      'application/services/node/node.facade.ts'
                  ),
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
    'rov-map-legacy-entity': {
        legacy: () =>
            legacyPage('interactive-map', 'domain/entities/map/map.entity.ts'),
        nx: () => 'libs/interactive-map/domain/src/lib/entities/map.entity.ts',
        layer: 'domain',
        oracle: () => modOracle('interactive-map', 'domain'),
    },
    'rov-map-legacy-repository': {
        legacy: () =>
            legacyPage(
                'interactive-map',
                'domain/repositories/map-repository.interface.ts'
            ),
        nx: () =>
            'libs/interactive-map/domain/src/lib/repositories/interactive-map.repository.ts',
        layer: 'domain',
        oracle: () => modOracle('interactive-map', 'domain'),
    },
    'rov-map-legacy-dto': {
        legacy: () =>
            legacyPage(
                'interactive-map',
                'infrastructure/api/dto/map/map-response.dto.ts'
            ),
        nx: () => 'libs/interactive-map/data/src/lib/dtos/map-response.dto.ts',
        layer: 'data',
        oracle: () => modOracle('interactive-map', 'data'),
    },
    'rov-map-legacy-mapper': {
        legacy: () =>
            legacyPage(
                'interactive-map',
                'infrastructure/data/mappers/map.mapper.ts'
            ),
        nx: () => 'libs/interactive-map/data/src/lib/mappers/map.mapper.ts',
        layer: 'data',
        oracle: () => modOracle('interactive-map', 'data'),
    },
    'rov-map-legacy-api': {
        legacy: () =>
            legacyPage(
                'interactive-map',
                'infrastructure/data/sources/map.api.ts'
            ),
        nx: () => 'libs/interactive-map/data/src/lib/sources/map.api.ts',
        layer: 'data',
        oracle: () => modOracle('interactive-map', 'data'),
    },
    'rov-map-legacy-use-case': {
        legacy: () =>
            legacyPage(
                'interactive-map',
                'application/use-cases/map/map.use-case.ts'
            ),
        nx: () =>
            'libs/interactive-map/application/src/lib/use-cases/map.use-case.ts',
        layer: 'application',
        oracle: () => modOracle('interactive-map', 'application'),
    },
    'rov-map-legacy-facade': {
        legacy: () =>
            legacyPage('interactive-map', 'application/services/map.facade.ts'),
        nx: () =>
            'libs/interactive-map/application/src/lib/facades/map.facade.ts',
        layer: 'application',
        oracle: () => modOracle('interactive-map', 'application'),
    },
    'rov-map-legacy-page': {
        legacy: () =>
            legacyPage(
                'interactive-map',
                'presentation/features/dashboard-map/map-page.component.ts'
            ),
        nx: () =>
            'libs/interactive-map/ui/src/lib/features/map-page.component.ts',
        layer: 'ui',
        oracle: () => modOracle('interactive-map', 'ui'),
        notes: 'Volet visualization — embed Grafana mapLink',
    },
    'rov-map-query-legacy': {
        legacy: () =>
            legacyPage(
                'interactive-map',
                'application/queries-bus/map/map.bus.ts'
            ),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        assumption_ref: 'A-2026-07-30-05',
    },
    'rov-map-query-handler-legacy': {
        legacy: () =>
            legacyPage(
                'interactive-map',
                'application/queries-handlers/map/map.handler.ts'
            ),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        assumption_ref: 'A-2026-07-30-05',
    },
    'rov-gis-legacy-page': {
        legacy: () =>
            legacyPage(
                'interactive-map',
                'presentation/features/interactive-map/pages/interactive-map.component.ts'
            ),
        nx: () =>
            'libs/interactive-map/ui/src/lib/features/interactive-map-page.component.ts',
        layer: 'ui',
        oracle: () => modOracle('interactive-map', 'ui'),
        notes: 'Coquille statique v0 — SIG OpenLayers hors périmètre IR',
    },
    'rov-gis-legacy-facade': {
        legacy: () =>
            legacyPage(
                'interactive-map',
                'presentation/facades/intercative-map.facade.ts'
            ),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        notes: 'Legacy SIG facade — non porté Nx v0',
    },
    'rov-gis-legacy-store': {
        legacy: () =>
            legacyPage('interactive-map', 'presentation/store/map.store.ts'),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        notes: 'Legacy OpenLayers store — hors périmètre IR',
    },
    'rov-gis-legacy-adapter': {
        legacy: () =>
            legacyPage(
                'interactive-map',
                'presentation/adapters/map.adapter.ts'
            ),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        notes: 'Legacy map adapter — hors périmètre IR',
    },
};
