/**
 * NODE_MAPPINGS pack 2/4 — règles legacy→Nx workflow-action.
 * Auto-découpé de mapping.mjs (plafond poids fichier CI).
 */
import {
    legacyPage,
    legacyListExportPage,
    listExportRefVolet,
    moduleOracle,
    modDetails,
    detailsDomainNxPath,
} from './mapping-helpers.mjs';

/** @type {Record<string, import('./mapping-helpers.mjs').NodeMapping>} */
export const NODE_MAPPINGS_PACK_2 = {
    'details-treat-api-dto': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'infrastructure/api/dto/details/details-treat-api.dto.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/data/src/lib/dtos/${modDetails(module)}-treat-api.dto.ts`,
        layer: 'data',
        oracle: ['@cmz/processing-data:build'],
    },
    'details-mapper': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'infrastructure/data/mappers/details/details.mapper.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/data/src/lib/mappers/${modDetails(module)}.mapper.ts`,
        layer: 'data',
        oracle: ['@cmz/processing-data:build', '@cmz/processing-data:test'],
    },
    'details-filter-mapper': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'infrastructure/data/mappers/details/details-filter.mapper.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/data/src/lib/mappers/${modDetails(module)}-filter.mapper.ts`,
        layer: 'data',
        oracle: ['@cmz/processing-data:build'],
    },
    'details-take-mapper': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'infrastructure/data/mappers/details/details-take.mapper.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/data/src/lib/mappers/${modDetails(module)}-take.mapper.ts`,
        layer: 'data',
        oracle: ['@cmz/processing-data:build'],
    },
    'details-treat-mapper': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'infrastructure/data/mappers/details/details-treat.mapper.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/data/src/lib/mappers/${modDetails(module)}-treat.mapper.ts`,
        layer: 'data',
        oracle: ['@cmz/processing-data:build'],
    },
    'details-finalize-entity': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'domain/entities/details/details-finalize.entity.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/domain/src/lib/entities/${modDetails(module)}-finalize.entity.ts`,
        layer: 'domain',
        oracle: ['@cmz/processing-domain:build'],
    },
    'details-finalize-vo': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'domain/value-objects/details/details-finalize.vo.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/domain/src/lib/value-objects/${modDetails(module)}-finalize.vo.ts`,
        layer: 'domain',
        oracle: ['@cmz/processing-domain:build', '@cmz/processing-domain:test'],
    },
    'details-finalize-api-dto': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'infrastructure/api/dto/details/details-finalize-api.dto.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/data/src/lib/dtos/${modDetails(module)}-finalize-api.dto.ts`,
        layer: 'data',
        oracle: ['@cmz/processing-data:build'],
    },
    'details-finalize-mapper': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'infrastructure/data/mappers/details/details-finalize.mapper.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/data/src/lib/mappers/${modDetails(module)}-finalize.mapper.ts`,
        layer: 'data',
        oracle: ['@cmz/processing-data:build', '@cmz/processing-data:test'],
    },
    'details-dialog-ui': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'presentation/features/queues/queues.component.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/ui/src/lib/features/${modDetails(module)}-dialog.component.ts`,
        layer: 'ui',
        oracle: ['@cmz/processing-ui:build'],
        notes: 'Dialog dédié Nx ; legacy ouvre ManagementDialog depuis les pages listes',
    },
    'details-api-source': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'infrastructure/data/sources/details/details.api.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/data/src/lib/sources/${modDetails(module)}.api.ts`,
        layer: 'data',
        oracle: ['@cmz/processing-data:build'],
    },
    'details-repository-impl': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'infrastructure/data/repositories/details/details-repository.impl.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/data/src/lib/repositories/${modDetails(module)}.repository.impl.ts`,
        layer: 'data',
        oracle: ['@cmz/processing-data:build'],
    },
    'details-use-case': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'application/use-cases/details/details.use-case.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/application/src/lib/use-cases/${modDetails(module)}.use-case.ts`,
        layer: 'application',
        oracle: [
            '@cmz/processing-application:build',
            '@cmz/processing-application:test',
        ],
    },
    'details-facade': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'application/services/details/details.facade.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/application/src/lib/facades/${modDetails(module)}.facade.ts`,
        layer: 'application',
        oracle: ['@cmz/processing-application:build'],
    },
    'details-permissions-legacy': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'domain/functions/details/details-permissions-take.function.ts'
            ),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        notes: (ctx) =>
            `Permissions take/treat — fonctions pures domaine Nx (${modDetails(ctx.module)}-permissions.util.ts) ; audit référence requis`,
        assumption_ref: 'A-2026-07-30-12',
    },
    'details-providers-legacy': {
        legacy: ({ module }) =>
            legacyPage(module, 'di/details/details.providers.ts'),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        notes: (ctx) =>
            `Binding details absorbé par provide${ctx.module.charAt(0).toUpperCase()}${ctx.module.slice(1)}()`,
        assumption_ref: 'A-2026-07-30-04',
    },
    'details-query-bus-legacy': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'application/queries-bus/details/details.bus.ts'
            ),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        assumption_ref: 'A-2026-07-30-05',
    },
    'details-query-handler-legacy': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'application/queries-handlers/details/details.handler.ts'
            ),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        assumption_ref: 'A-2026-07-30-05',
    },
    'details-query-legacy': {
        legacy: ({ module }) =>
            legacyPage(module, 'application/queries/details/details.query.ts'),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        assumption_ref: 'A-2026-07-30-05',
    },
    'details-query-mapper-legacy': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'application/queries-mappers/details/details.mapper.ts'
            ),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        assumption_ref: 'A-2026-07-30-05',
    },
    'details-take-command-bus-legacy': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'application/commands-bus/details/details-take.bus.ts'
            ),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        notes: 'Command bus take → use-case direct Nx',
        assumption_ref: 'A-2026-07-30-05',
    },
    'details-take-command-handler-legacy': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'application/commands-handlers/details/details-take.handler.ts'
            ),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        assumption_ref: 'A-2026-07-30-05',
    },
    'details-take-command-legacy': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'application/commands/details/details-take.command.ts'
            ),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        assumption_ref: 'A-2026-07-30-05',
    },
    'details-take-command-mapper-legacy': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'application/commands-mappers/details/details-take.mapper.ts'
            ),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        assumption_ref: 'A-2026-07-30-05',
    },
    'details-treat-command-bus-legacy': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'application/commands-bus/details/details-treat.bus.ts'
            ),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        assumption_ref: 'A-2026-07-30-05',
    },
    'details-treat-command-handler-legacy': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'application/commands-handlers/details/details-treat.handler.ts'
            ),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        assumption_ref: 'A-2026-07-30-05',
    },
    'details-treat-command-legacy': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'application/commands/details/details-treat.command.ts'
            ),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        assumption_ref: 'A-2026-07-30-05',
    },
    'details-treat-command-mapper-legacy': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'application/commands-mappers/details/details-treat.mapper.ts'
            ),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        assumption_ref: 'A-2026-07-30-05',
    },
    'details-finalize-command-bus-legacy': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'application/commands-bus/details/details-finalize.bus.ts'
            ),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        assumption_ref: 'A-2026-07-30-05',
    },
    'details-finalize-command-handler-legacy': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'application/commands-handlers/details/details-finalize.handler.ts'
            ),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        assumption_ref: 'A-2026-07-30-05',
    },
    'details-finalize-command-legacy': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'application/commands/details/details-finalize.command.ts'
            ),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        assumption_ref: 'A-2026-07-30-05',
    },
    'details-finalize-command-mapper-legacy': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'application/commands-mappers/details/details-finalize.mapper.ts'
            ),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        assumption_ref: 'A-2026-07-30-05',
    },
    // --- requests details — approve/reject (legacy ≠ processing treat) ---
    'details-approve-entity': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'domain/entities/details/details-approve.entity.ts'
            ),
        nx: ({ module }) =>
            detailsDomainNxPath(
                module,
                `libs/${module}/domain/src/lib/entities/${modDetails(module)}-approve.entity.ts`,
                'entities/workflow-details-approve.entity.ts'
            ),
        layer: 'domain',
        oracle: ['@cmz/processing-domain:build'],
    },
    'details-reject-entity': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'domain/entities/details/details-reject.entity.ts'
            ),
        nx: ({ module }) =>
            detailsDomainNxPath(
                module,
                `libs/${module}/domain/src/lib/entities/${modDetails(module)}-reject.entity.ts`,
                'entities/workflow-details-reject.entity.ts'
            ),
        layer: 'domain',
        oracle: ['@cmz/processing-domain:build'],
    },
    'details-qualification-vo': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'domain/value-objects/details/details-approve.vo.ts'
            ),
        nx: ({ module }) =>
            detailsDomainNxPath(
                module,
                `libs/${module}/domain/src/lib/value-objects/${modDetails(module)}-qualification.vo.ts`,
                'value-objects/workflow-details-qualification.vo.ts'
            ),
        layer: 'domain',
        oracle: ['@cmz/processing-domain:build', '@cmz/processing-domain:test'],
        notes: 'VO unifié accept/reject (legacy approve.vo + reject.vo)',
    },
    'details-permissions-util': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'domain/functions/details/details-permissions-take.function.ts'
            ),
        nx: ({ module }) =>
            detailsDomainNxPath(
                module,
                `libs/${module}/domain/src/lib/utils/${modDetails(module)}-permissions.util.ts`,
                'utils/workflow-details-permissions.util.ts'
            ),
        layer: 'domain',
        oracle: ['@cmz/processing-domain:build', '@cmz/processing-domain:test'],
        notes: 'Fusion take/approve/reject/manage legacy → utils pures Nx',
    },
    'details-label-util': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'domain/functions/details/details-title.function.ts'
            ),
        nx: ({ module }) =>
            detailsDomainNxPath(
                module,
                `libs/${module}/domain/src/lib/utils/${modDetails(module)}-label.util.ts`,
                'utils/workflow-details-label.util.ts'
            ),
        layer: 'domain',
        oracle: ['@cmz/processing-domain:build', '@cmz/processing-domain:test'],
        notes: 'title + submit label (legacy title + label-button-submit)',
    },
    'details-approve-api-dto': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'infrastructure/api/dto/details/details-approve-api.dto.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/data/src/lib/dtos/${modDetails(module)}-approve-api.dto.ts`,
        layer: 'data',
        oracle: ['@cmz/processing-data:build'],
    },
    'details-reject-api-dto': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'infrastructure/api/dto/details/details-reject-api.dto.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/data/src/lib/dtos/${modDetails(module)}-reject-api.dto.ts`,
        layer: 'data',
        oracle: ['@cmz/processing-data:build'],
    },
    'details-approve-mapper': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'infrastructure/data/mappers/details/details-approve.mapper.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/data/src/lib/mappers/${modDetails(module)}-approve.mapper.ts`,
        layer: 'data',
        oracle: ['@cmz/processing-data:build', '@cmz/processing-data:test'],
    },
    'details-reject-mapper': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'infrastructure/data/mappers/details/details-reject.mapper.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/data/src/lib/mappers/${modDetails(module)}-reject.mapper.ts`,
        layer: 'data',
        oracle: ['@cmz/processing-data:build', '@cmz/processing-data:test'],
    },
    'details-dialog-component': {
        legacy: ({ module }) =>
            module === 'report-states'
                ? legacyPage(
                      module,
                      'presentation/features/approve/approve.component.ts'
                  )
                : legacyPage(
                      module,
                      'presentation/features/queues/queues.component.ts'
                  ),
        nx: ({ module }) =>
            `libs/${module}/ui/src/lib/features/${modDetails(module)}-dialog.component.ts`,
        layer: 'ui',
        oracle: ['@cmz/processing-ui:build'],
        notes: 'Dialog dédié Nx ; legacy ouvre ManagementDialog depuis les pages listes',
    },
};
