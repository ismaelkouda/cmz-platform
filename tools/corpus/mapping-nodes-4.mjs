/**
 * NODE_MAPPINGS pack 4/4 — règles legacy→Nx workflow-action.
 * Auto-découpé de mapping.mjs (plafond poids fichier CI).
 */
import {
    legacyPage,
    legacyListExportPage,
    listExportRefVolet,
    moduleOracle,
    modDetails,
} from './mapping-helpers.mjs';

/** @type {Record<string, import('./mapping-helpers.mjs').NodeMapping>} */
export const NODE_MAPPINGS_PACK_4 = {
    'details-reject-motif-constants': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'domain/value-objects/details/details-reject.vo.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/ui/src/lib/constants/${modDetails(module)}-reject-motif.constant.ts`,
        layer: 'ui',
        oracle: ['@cmz/processing-ui:build'],
        notes: 'Motifs rejet i18n — decision=rejected',
    },
    'details-callback-legacy-ui': {
        legacy: () =>
            'src/shared/components/management/presentation/management-callback/management-callback.component.ts',
        nx: ({ module }) =>
            `libs/${module}/ui/src/lib/features/${modDetails(module)}-qualification-form.component.ts`,
        layer: 'ui',
        oracle: ['@cmz/processing-ui:build'],
        notes: 'Sélecteur approvalType/callbackType inline dans qualification-form (legacy ManagementCallbackComponent)',
    },
    // --- processing.tasks.actions — CRUD actions de traitement ---
    'tasks-actions-props': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'domain/interfaces/tasks/tasks-actions/tasks-actions-props.interface.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/domain/src/lib/props/tasks-actions-processing.props.ts`,
        layer: 'domain',
        oracle: ['@cmz/processing-domain:build'],
    },
    'tasks-actions-entity': {
        legacy: ({ module }) =>
            legacyPage(module, 'domain/entities/tasks/tasks-actions.entity.ts'),
        nx: ({ module }) =>
            `libs/${module}/domain/src/lib/entities/tasks-actions-processing.entity.ts`,
        layer: 'domain',
        oracle: ['@cmz/processing-domain:build'],
    },
    'tasks-actions-contract': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'domain/contracts/tasks/tasks-actions-create.contract.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/domain/src/lib/contracts/tasks-actions-processing.contract.ts`,
        layer: 'domain',
        oracle: ['@cmz/processing-domain:build'],
        notes: 'Contrats CRUD unifiés (create/update/delete/filter)',
    },
    'tasks-actions-vo': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'domain/value-objects/tasks/tasks-actions-filter.vo.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/domain/src/lib/value-objects/tasks-actions-processing.vo.ts`,
        layer: 'domain',
        oracle: ['@cmz/processing-domain:build', '@cmz/processing-domain:test'],
    },
    'tasks-actions-validator': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'domain/validators/tasks/tasks-actions-create.validator.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/domain/src/lib/validators/tasks-actions-processing.validator.ts`,
        layer: 'domain',
        oracle: ['@cmz/processing-domain:build'],
    },
    'tasks-actions-conformity-enum': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'domain/enums/tasks/tasks-actions-conformity.enum.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/domain/src/lib/enums/tasks-actions-processing-conformity.enum.ts`,
        layer: 'domain',
        oracle: ['@cmz/processing-domain:build'],
    },
    'tasks-actions-repository-port': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'domain/repositories/tasks/tasks-actions.repository.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/domain/src/lib/repositories/tasks-actions-processing.repository.ts`,
        layer: 'domain',
        oracle: ['@cmz/processing-domain:build'],
    },
    'tasks-actions-api-dto': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'infrastructure/api/dto/tasks/tasks-actions-response-api.dto.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/data/src/lib/dtos/tasks-actions-processing-api.dto.ts`,
        layer: 'data',
        oracle: ['@cmz/processing-data:build'],
    },
    'tasks-actions-item-mapper': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'infrastructure/data/mappers/tasks/tasks-actions.mapper.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/data/src/lib/mappers/tasks-actions-processing-item.mapper.ts`,
        layer: 'data',
        oracle: ['@cmz/processing-data:build'],
    },
    'tasks-actions-filter-mapper': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'infrastructure/data/mappers/tasks/tasks-actions-filter.mapper.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/data/src/lib/mappers/tasks-actions-processing-filter.mapper.ts`,
        layer: 'data',
        oracle: ['@cmz/processing-data:build'],
    },
    'tasks-actions-mutation-mapper': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'infrastructure/data/mappers/tasks/tasks-actions-create.mapper.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/data/src/lib/mappers/tasks-actions-processing-mutation.mapper.ts`,
        layer: 'data',
        oracle: ['@cmz/processing-data:build'],
        notes: 'Create/update unifiés (legacy create + update mappers)',
    },
    'tasks-actions-conformity-mapper': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'infrastructure/data/mappers/tasks/tasks-actions-conformity.mapper.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/data/src/lib/mappers/tasks-actions-processing-conformity.mapper.ts`,
        layer: 'data',
        oracle: ['@cmz/processing-data:build'],
    },
    'tasks-actions-store-mapper': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'infrastructure/data/mappers/tasks/tasks-actions-store.mapper.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/data/src/lib/mappers/tasks-actions-processing-store.mapper.ts`,
        layer: 'data',
        oracle: ['@cmz/processing-data:build'],
    },
    'tasks-actions-api-source': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'infrastructure/data/sources/tasks/tasks-actions.api.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/data/src/lib/sources/tasks-actions-processing.api.ts`,
        layer: 'data',
        oracle: ['@cmz/processing-data:build'],
    },
    'tasks-actions-repository-impl': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'infrastructure/data/repositories/tasks/tasks-actions.repository.impl.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/data/src/lib/repositories/tasks-actions-processing.repository.impl.ts`,
        layer: 'data',
        oracle: ['@cmz/processing-data:build'],
    },
    'tasks-actions-use-case': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'application/use-cases/tasks/tasks-actions.use-case.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/application/src/lib/use-cases/tasks-actions-processing.use-case.ts`,
        layer: 'application',
        oracle: [
            '@cmz/processing-application:build',
            '@cmz/processing-application:test',
        ],
    },
    'tasks-actions-use-case-spec': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'application/use-cases/tasks/tasks-actions.use-case.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/application/src/lib/use-cases/tasks-actions-processing.use-case.spec.ts`,
        layer: 'application',
        oracle: ['@cmz/processing-application:test'],
    },
    'tasks-actions-facade': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'application/services/tasks/tasks-actions.facade.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/application/src/lib/facades/tasks-actions-processing.facade.ts`,
        layer: 'application',
        oracle: ['@cmz/processing-application:build'],
    },
    'tasks-actions-page-component': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'presentation/actions-treatment/actions-treatment.component.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/ui/src/lib/features/tasks-actions-processing-page.component.ts`,
        layer: 'ui',
        oracle: ['@cmz/processing-ui:build'],
    },
    'tasks-actions-form-dialog': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'presentation/actions-treatment/actions-treatment.component.html'
            ),
        nx: ({ module }) =>
            `libs/${module}/ui/src/lib/features/tasks-actions-processing-form-dialog.component.ts`,
        layer: 'ui',
        oracle: ['@cmz/processing-ui:build'],
        notes: 'Formulaire create/edit extrait en dialog standalone Nx',
    },
    'tasks-actions-presenter': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'presentation/adapters/tasks/actions-treatment/actions-treatment-vm.presenter.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/ui/src/lib/adapters/tasks-actions-processing-vm.presenter.ts`,
        layer: 'ui',
        oracle: ['@cmz/processing-ui:build'],
    },
    'tasks-actions-table-constants': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'presentation/adapters/tasks/actions-treatment/tasks-actions-table.constant.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/ui/src/lib/constants/tasks-actions-processing-table.constant.ts`,
        layer: 'ui',
        oracle: ['@cmz/processing-ui:build'],
    },
    'tasks-actions-type-entity': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'domain/entities/tasks/tasks-actions-type.entity.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/domain/src/lib/entities/tasks-actions-type-processing.entity.ts`,
        layer: 'domain',
        oracle: ['@cmz/processing-domain:build'],
    },
    'tasks-actions-type-repository-port': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'domain/repositories/tasks/tasks-actions-type-repository.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/domain/src/lib/repositories/tasks-actions-type-processing.repository.ts`,
        layer: 'domain',
        oracle: ['@cmz/processing-domain:build'],
    },
    'tasks-actions-type-use-case': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'application/use-cases/tasks/tasks-actions-type.use-case.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/application/src/lib/use-cases/tasks-actions-type-processing.use-case.ts`,
        layer: 'application',
        oracle: ['@cmz/processing-application:build'],
    },
    'tasks-actions-type-facade': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'application/services/tasks/tasks-actions-type.facade.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/application/src/lib/facades/tasks-actions-type-processing.facade.ts`,
        layer: 'application',
        oracle: ['@cmz/processing-application:build'],
    },
    'tasks-actions-query-legacy': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'application/queries/tasks/tasks-actions.query.ts'
            ),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        assumption_ref: 'A-2026-07-30-05',
    },
    'tasks-actions-create-command-legacy': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'application/commands/tasks/tasks-actions-create.command.ts'
            ),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        assumption_ref: 'A-2026-07-30-05',
    },
    'tasks-actions-update-command-legacy': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'application/commands/tasks/tasks-actions-update.command.ts'
            ),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        assumption_ref: 'A-2026-07-30-05',
    },
    'tasks-actions-delete-command-legacy': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'application/commands/tasks/tasks-actions-delete.command.ts'
            ),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        assumption_ref: 'A-2026-07-30-05',
    },
    'tasks-actions-providers-legacy': {
        legacy: ({ module }) =>
            legacyPage(module, 'di/tasks/tasks-actions.providers.ts'),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        assumption_ref: 'A-2026-07-30-05',
    },
};
