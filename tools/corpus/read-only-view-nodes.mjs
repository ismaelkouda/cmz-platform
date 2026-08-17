/**
 * ROV_NODE_MAPPINGS — nœuds IR read-only-view (plafond 800 l.).
 */
import {
    legacyPage,
    mapperNxPath,
    viewEntityNxPath,
    viewEntityOracle,
    variablesDtoNxPath,
    apiSourceNxPath,
    useCaseNxPath,
    modOracle,
} from './read-only-view-shared.mjs';

/** @type {Record<string, import('./mapping.mjs').NodeMapping>} */
export const ROV_NODE_MAPPINGS = {
    'rov-view-entity': {
        // OPS-17 (2026-08-17) : nœud de module.shell — le dossier
        // représentatif dépend du module (`node` pour monitoring, `reports`
        // pour reporting), pas hardcodé `node` (bug qui pointait
        // `reporting.shell.rov-view-entity` vers un chemin monitoring
        // inexistant côté reporting).
        legacy: ({ module, legacyFolder }) =>
            module === 'interactive-map'
                ? legacyPage(module, 'domain/entities/map/map.entity.ts')
                : legacyPage(
                      module,
                      `domain/entities/${legacyFolder}/${legacyFolder}.entity.ts`
                  ),
        nx: ({ module }) => viewEntityNxPath(module),
        layer: 'domain',
        // T1-6 (2026-08-10) — GrafanaDashboardEntity/MapEntity supprimés,
        // remplacés par 1 GrafanaLinkEntity dans @cmz/shared-domain :
        // l'oracle suit le fichier, pas le module (audit self-review
        // post-ADR-0022, 2026-08-11 — voir viewEntityNxPath).
        oracle: () => viewEntityOracle(),
        notes: ({ module }) =>
            module === 'interactive-map'
                ? 'MapEntity → GrafanaLinkEntity (@cmz/shared-domain, T1-6)'
                : 'Legacy node entity représentatif — consolidation → GrafanaLinkEntity (@cmz/shared-domain, T1-6)',
    },
    'rov-section-enum': {
        // OPS-17 (2026-08-17) : `domain/enums/node/node.enum.ts` n'existe
        // sous AUCUN nom dans le legacy monitoring/reporting au pin
        // cb15bf80fa072e12e9d4fce4b9236abe6ac78058 — confirmé par recherche
        // exhaustive `find -iname "*enum*"` sur tout l'arbre legacy lors
        // d'OPS-15 (2026-08-17) : des enums existent pour d'autres modules
        // (finalization, requests, coverage-areas…) mais jamais pour
        // monitoring/reporting. Ce n'est pas un renommage caché mais une
        // absence de design côté legacy (section pilotée autrement, pas par
        // un enum dédié) — l'enum Nx `${module}-section.enum.ts` reste un
        // artefact réel (unification MonitoringSection/ReportingSection),
        // seule la correspondance legacy est déclarée `n/a` par décision
        // explicite plutôt que de rester `blocked` indéfiniment.
        legacy: ({ module }) =>
            legacyPage(module, 'domain/enums/node/node.enum.ts'),
        nx: ({ module }) =>
            `libs/${module}/domain/src/lib/enums/${module}-section.enum.ts`,
        layer: 'domain',
        oracle: (ctx) => modOracle(ctx.module, 'domain'),
        statusOverride: 'n/a',
        notes: 'Enum section — pas de contrepartie legacy (design absent, confirmé par recherche exhaustive OPS-15) ; Nx unifie MonitoringSection / ReportingSection',
    },
    'rov-repository-port': {
        // OPS-17 (2026-08-17) : plat, sans sous-dossier de section, suffixe
        // `-repository.interface.ts` — vérifié clone frais legacy (pin
        // cb15bf80fa072e12e9d4fce4b9236abe6ac78058).
        legacy: ({ module, legacyFlat }) =>
            module === 'interactive-map'
                ? legacyPage(
                      module,
                      'domain/repositories/map-repository.interface.ts'
                  )
                : legacyPage(
                      module,
                      `domain/repositories/${legacyFlat}-repository.interface.ts`
                  ),
        nx: ({ module }) =>
            `libs/${module}/domain/src/lib/repositories/${module}.repository.ts`,
        layer: 'domain',
        oracle: (ctx) => modOracle(ctx.module, 'domain'),
    },
    'rov-variables-dto': {
        // OPS-17 (2026-08-17) : suffixe réel `-response.dto.ts`, pas
        // `-response-api.dto.ts` ; dossier = facadeKebab (`report/`, pas
        // `reports/` = legacyFolder), stem fichier = legacyFlat
        // (`report-response.dto.ts`) — nœud de module.shell, doit suivre le
        // module représentatif (`node` monitoring, `report` reporting), pas
        // hardcodé `node` (clone frais legacy).
        legacy: ({ module, facadeKebab, legacyFlat }) =>
            module === 'interactive-map'
                ? legacyPage(
                      module,
                      'infrastructure/api/dto/map/map-response.dto.ts'
                  )
                : legacyPage(
                      module,
                      `infrastructure/api/dto/${facadeKebab}/${legacyFlat}-response.dto.ts`
                  ),
        nx: ({ module }) => variablesDtoNxPath(module),
        layer: 'data',
        oracle: (ctx) => modOracle(ctx.module, 'data'),
        notes: 'DTO wire unique regroupant tous les champs variables',
    },
    'rov-mapper': {
        // OPS-17 (2026-08-17) : plat, sans sous-dossier de section.
        legacy: ({ module, legacyFlat }) =>
            module === 'interactive-map'
                ? legacyPage(
                      module,
                      'infrastructure/data/mappers/map.mapper.ts'
                  )
                : legacyPage(
                      module,
                      `infrastructure/data/mappers/${legacyFlat}.mapper.ts`
                  ),
        nx: ({ module }) => mapperNxPath(module),
        layer: 'data',
        oracle: (ctx) => modOracle(ctx.module, 'data'),
    },
    'rov-api-source': {
        // OPS-17 (2026-08-17) : plat, sans sous-dossier de section.
        legacy: ({ module, legacyFlat }) =>
            module === 'interactive-map'
                ? legacyPage(module, 'infrastructure/data/sources/map.api.ts')
                : legacyPage(
                      module,
                      `infrastructure/data/sources/${legacyFlat}.api.ts`
                  ),
        nx: ({ module }) => apiSourceNxPath(module),
        layer: 'data',
        oracle: (ctx) => modOracle(ctx.module, 'data'),
    },
    'rov-repository-impl': {
        // OPS-17 (2026-08-17) : plat, sans sous-dossier — mais contrairement
        // à mapper/api/facade/repository-port, ce fichier suit
        // `legacyFolder` (pluriel `reports.repository.impl.ts` pour
        // reporting.report), pas `legacyFlat` (singulier). Convention
        // irrégulière constatée sur le clone frais legacy — pas une
        // erreur de saisie, une incohérence réelle du code source.
        legacy: ({ module, legacyFolder }) =>
            module === 'interactive-map'
                ? legacyPage(
                      module,
                      'infrastructure/repositories/map.repository.impl.ts'
                  )
                : legacyPage(
                      module,
                      `infrastructure/data/repositories/${legacyFolder}.repository.impl.ts`
                  ),
        nx: ({ module }) =>
            `libs/${module}/data/src/lib/repositories/${module}.repository.impl.ts`,
        layer: 'data',
        oracle: (ctx) => modOracle(ctx.module, 'data'),
    },
    'rov-use-case': {
        // OPS-17 (2026-08-17) : nœud de module.shell — dossier représentatif
        // dépendant du module (même correction que rov-view-entity).
        legacy: ({ module, legacyFolder }) =>
            module === 'interactive-map'
                ? legacyPage(
                      module,
                      'application/use-cases/map/map.use-case.ts'
                  )
                : legacyPage(
                      module,
                      `application/use-cases/${legacyFolder}/${legacyFolder}.use-case.ts`
                  ),
        nx: ({ module }) => useCaseNxPath(module),
        layer: 'application',
        oracle: (ctx) => modOracle(ctx.module, 'application'),
    },
    'module-routes-legacy': {
        // OPS-17 (2026-08-17) : `reporting` nomme son fichier de routes au
        // singulier (`reporting.route.ts`), pas `reporting.routes.ts` comme
        // `monitoring`/`interactive-map` — vérifié clone frais legacy.
        legacy: ({ module }) =>
            legacyPage(
                module,
                `${module}.${module === 'reporting' ? 'route' : 'routes'}.ts`
            ),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        notes: (ctx) => `Routes migrées vers libs/${ctx.module}/ui`,
    },
    'module-routes-nx': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                `${module}.${module === 'reporting' ? 'route' : 'routes'}.ts`
            ),
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
        // OPS-17 (2026-08-17) : plat, sans sous-dossier — et le stem dépend
        // du module (`node` monitoring, `report` reporting), pas hardcodé.
        legacy: ({ module, legacyFlat }) =>
            module === 'interactive-map'
                ? legacyPage(module, 'application/services/map.facade.ts')
                : legacyPage(
                      module,
                      `application/services/${legacyFlat}.facade.ts`
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
        // T1-6 (2026-08-10) — voir rov-view-entity / viewEntityNxPath :
        // même entité partagée, même correction (audit self-review
        // post-ADR-0022, 2026-08-11).
        nx: () => viewEntityNxPath(),
        layer: 'domain',
        oracle: () => viewEntityOracle(),
        notes: 'Consolidation N× verticals → 1 GrafanaLinkEntity (@cmz/shared-domain, T1-6)',
    },
    'rov-section-legacy-repository': {
        // OPS-17 (2026-08-17) : plat, sans sous-dossier, suffixe
        // `-repository.interface.ts` (clone frais legacy).
        legacy: ({ module, legacyFlat }) =>
            legacyPage(
                module,
                `domain/repositories/${legacyFlat}-repository.interface.ts`
            ),
        nx: ({ module }) =>
            `libs/${module}/domain/src/lib/repositories/${module}.repository.ts`,
        layer: 'domain',
        oracle: (ctx) => modOracle(ctx.module, 'domain'),
        notes: 'Port unique paramétré par section',
    },
    'rov-section-legacy-mapper': {
        // OPS-17 (2026-08-17) : plat, sans sous-dossier de section.
        legacy: ({ module, legacyFlat }) =>
            legacyPage(
                module,
                `infrastructure/data/mappers/${legacyFlat}.mapper.ts`
            ),
        nx: ({ module }) => mapperNxPath(module),
        layer: 'data',
        oracle: (ctx) => modOracle(ctx.module, 'data'),
    },
    'rov-section-legacy-api': {
        // OPS-17 (2026-08-17) : plat, sans sous-dossier de section.
        legacy: ({ module, legacyFlat }) =>
            legacyPage(
                module,
                `infrastructure/data/sources/${legacyFlat}.api.ts`
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
        // OPS-17 (2026-08-17) : plat, sans sous-dossier de section — et le
        // stem est `legacyFlat` (singulier pour reporting.requests →
        // `request.facade.ts`), pas `legacyFolder`.
        legacy: ({ module, legacyFlat }) =>
            legacyPage(module, `application/services/${legacyFlat}.facade.ts`),
        nx: ({ module, facadeKebab }) =>
            `libs/${module}/application/src/lib/facades/${facadeKebab}.facade.ts`,
        layer: 'application',
        oracle: (ctx) => modOracle(ctx.module, 'application'),
    },
    'rov-section-legacy-page': {
        // OPS-17 (2026-08-17) : arborescence réelle
        // `presentation/features/{facadeKebab}/pages/{facadeKebab}-page/
        // {facadeKebab}-page.component.ts` — le dossier racine suit
        // `facadeKebab`, pas `legacyFolder` (constaté sur
        // reporting.report : dossier `report/`, alors que
        // `legacyFolder='reports'` pour ce même nœud) ; clone frais legacy.
        legacy: ({ module, facadeKebab }) =>
            legacyPage(
                module,
                `presentation/features/${facadeKebab}/pages/${facadeKebab}-page/${facadeKebab}-page.component.ts`
            ),
        nx: ({ module, facadeKebab }) =>
            `libs/${module}/ui/src/lib/features/${facadeKebab}-page.component.ts`,
        layer: 'ui',
        oracle: (ctx) => modOracle(ctx.module, 'ui'),
        notes: 'Page mince → cmz-grafana-embed',
    },
    'rov-section-query-legacy': {
        // OPS-17 (2026-08-17) : legacy a migré `application/queries/` vers
        // `application/queries-bus/{f}/{f}.bus.ts` (renommage constaté au
        // pin courant — n/a de toute façon, mais chemin gardé exact pour la
        // traçabilité de `existsAt`).
        legacy: ({ module, legacyFolder }) =>
            legacyPage(
                module,
                `application/queries-bus/${legacyFolder}/${legacyFolder}.bus.ts`
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
        // T1-6 (2026-08-10) — MapEntity supprimée, remplacée par
        // GrafanaLinkEntity dans @cmz/shared-domain (voir rov-view-entity /
        // viewEntityNxPath ; même correction, audit self-review
        // post-ADR-0022, 2026-08-11).
        nx: () => viewEntityNxPath(),
        layer: 'domain',
        oracle: () => viewEntityOracle(),
        notes: 'MapEntity → GrafanaLinkEntity (@cmz/shared-domain, T1-6)',
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
