/**
 * NODE_MAPPINGS pack 3/4 — règles legacy→Nx workflow-action.
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
export const NODE_MAPPINGS_PACK_3 = {
    'details-qualification-form': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'domain/value-objects/details/details-approve.vo.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/ui/src/lib/features/${modDetails(module)}-qualification-form.component.ts`,
        layer: 'ui',
        oracle: ['@cmz/processing-ui:build'],
        notes: 'Formulaire qualification inline (legacy dans ManagementDialog tabs)',
    },
    'details-info-panel': {
        legacy: () =>
            'src/shared/components/management/presentation/management-info-panel/management-info-panel.component.ts',
        nx: ({ module }) =>
            `libs/${module}/ui/src/lib/features/${modDetails(module)}-info-panel.component.ts`,
        layer: 'ui',
        oracle: ['@cmz/processing-ui:build'],
        notes: 'Onglet information (legacy ManagementDialog tab « information »)',
    },
    'details-photos-panel': {
        legacy: () =>
            'src/shared/components/management/presentation/management-photos-panel.component.html/management-photos-panel.component.ts',
        nx: ({ module }) =>
            `libs/${module}/ui/src/lib/features/${modDetails(module)}-photos-panel.component.ts`,
        layer: 'ui',
        oracle: ['@cmz/processing-ui:build'],
        notes: 'Onglet images (legacy ManagementDialog tab « images »)',
    },
    'details-location-panel': {
        legacy: () =>
            'src/shared/components/management/presentation/management-map/management-map.component.ts',
        nx: ({ module }) =>
            `libs/${module}/ui/src/lib/features/${modDetails(module)}-location-panel.component.ts`,
        layer: 'ui',
        oracle: ['@cmz/processing-ui:build'],
        notes: 'Onglet localisation ; Nx = lien OSM (substitut progressif de ManagementMap OpenLayers)',
    },
    'details-edit-fields': {
        legacy: () =>
            'src/shared/components/management/presentation/management-info-panel/management-info-panel.component.ts',
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        notes:
            'Fichier séparé absorbé dans details-qualification-form ' +
            '(commit b3d812c « refactor(forms): migrate qualification forms to ' +
            'Signal Forms » — *-qualification-form + *-edit-fields fusionnés ' +
            'en un seul composant Signal Forms, avant cette session). Nœud ' +
            'corpus jamais régénéré depuis ce merge — trouvé stale (status ' +
            'verified sur un chemin nx supprimé) en exécutant emit-pairs ' +
            '--verify pendant le POC ADR-0020 ; corrigé ici, indépendant de ' +
            'la factorisation workflow-details.',
    },
    'details-approve-command-bus-legacy': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'application/commands-bus/details/details-approve.bus.ts'
            ),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        assumption_ref: 'A-2026-07-30-05',
    },
    'details-approve-command-handler-legacy': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'application/commands-handlers/details/details-approve.handler.ts'
            ),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        assumption_ref: 'A-2026-07-30-05',
    },
    'details-approve-command-legacy': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'application/commands/details/details-approve.command.ts'
            ),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        assumption_ref: 'A-2026-07-30-05',
    },
    'details-approve-command-mapper-legacy': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'application/commands-mappers/details/details-approve.mapper.ts'
            ),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        assumption_ref: 'A-2026-07-30-05',
    },
    'details-reject-command-bus-legacy': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'application/commands-bus/details/details-reject.bus.ts'
            ),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        assumption_ref: 'A-2026-07-30-05',
    },
    'details-reject-command-handler-legacy': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'application/commands-handlers/details/details-reject.handler.ts'
            ),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        assumption_ref: 'A-2026-07-30-05',
    },
    'details-reject-command-legacy': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'application/commands/details/details-reject.command.ts'
            ),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        assumption_ref: 'A-2026-07-30-05',
    },
    'details-reject-command-mapper-legacy': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'application/commands-mappers/details/details-reject.mapper.ts'
            ),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        assumption_ref: 'A-2026-07-30-05',
    },
    // --- requests.export.list — export Excel (legacy page → Nx backend export) ---
    'list-export-legacy-ui': {
        legacy: ({ module }) =>
            legacyListExportPage(
                module,
                'presentation/features/queues/queues.component.ts'
            ),
        nx: ({ module }) => {
            const volet = listExportRefVolet(module);
            return `libs/${module}/ui/src/lib/features/${volet}-${module}-page.component.ts`;
        },
        layer: 'ui',
        oracle: ['@cmz/processing-ui:build'],
        notes: 'Legacy exporte la page courante via ExcelExportService ; Nx appelle facade.export() + requests-list-export.util (pattern répété tasks/all)',
    },
    'list-export-endpoints': {
        legacy: ({ module }) =>
            legacyPage(module, `infrastructure/api/${module}.endpoints.ts`),
        nx: ({ module }) =>
            `libs/${module}/data/src/lib/endpoints/${module}.endpoints.ts`,
        layer: 'data',
        oracle: ['@cmz/processing-data:build'],
        notes: 'Nx ajoute QUEUES_EXPORT / TASKS_EXPORT / ALL_EXPORT — absent legacy (export client uniquement)',
    },
    'list-export-api-source': {
        legacy: ({ module }) => {
            const volet = listExportRefVolet(module);
            return legacyPage(
                module,
                `infrastructure/data/sources/${volet}/${volet}.api.ts`
            );
        },
        nx: ({ module }) => {
            const volet = listExportRefVolet(module);
            return `libs/${module}/data/src/lib/sources/${volet}-${module}.api.ts`;
        },
        layer: 'data',
        oracle: ['@cmz/processing-data:build'],
        notes: 'Méthode export() sur source HTTP — volet queues référence (tasks/all analogues)',
    },
    'list-export-repository-port': {
        legacy: ({ module }) => {
            const volet = listExportRefVolet(module);
            return legacyPage(
                module,
                `domain/repositories/${volet}/${volet}.repository.ts`
            );
        },
        nx: ({ module }) => {
            const volet = listExportRefVolet(module);
            return `libs/${module}/domain/src/lib/repositories/${volet}-${module}.repository.ts`;
        },
        layer: 'domain',
        oracle: ['@cmz/processing-domain:build'],
        notes: 'Port liste étendu de export() — absent legacy',
    },
    'list-export-repository-impl': {
        legacy: ({ module }) => {
            const volet = listExportRefVolet(module);
            return legacyPage(
                module,
                `infrastructure/data/repositories/${volet}/${volet}.repository.impl.ts`
            );
        },
        nx: ({ module }) => {
            const volet = listExportRefVolet(module);
            return `libs/${module}/data/src/lib/repositories/${volet}-${module}.repository.impl.ts`;
        },
        layer: 'data',
        oracle: ['@cmz/processing-data:build'],
        notes: 'Impl export() délègue à api.export()',
    },
    'list-export-use-case': {
        legacy: ({ module }) => {
            const volet = listExportRefVolet(module);
            return legacyPage(
                module,
                `application/use-cases/${volet}/${volet}.use-case.ts`
            );
        },
        nx: ({ module }) => {
            const volet = listExportRefVolet(module);
            return `libs/${module}/application/src/lib/use-cases/${volet}-${module}.use-case.ts`;
        },
        layer: 'application',
        oracle: [
            '@cmz/processing-application:build',
            '@cmz/processing-application:test',
        ],
        notes: 'export(filter) sans page — volet queues référence',
    },
    'list-export-use-case-spec': {
        legacy: ({ module }) => {
            const volet = listExportRefVolet(module);
            return legacyPage(
                module,
                `application/use-cases/${volet}/${volet}.use-case.ts`
            );
        },
        nx: ({ module }) => {
            const volet = listExportRefVolet(module);
            return `libs/${module}/application/src/lib/use-cases/${volet}-${module}.use-case.spec.ts`;
        },
        layer: 'application',
        oracle: ['@cmz/processing-application:test'],
        notes: 'Spec export delegates to repository — tasks/all specs analogues',
    },
    'list-export-facade': {
        legacy: ({ module }) => {
            const volet = listExportRefVolet(module);
            return legacyPage(
                module,
                `application/services/${volet}/${volet}.facade.ts`
            );
        },
        nx: ({ module }) => {
            const volet = listExportRefVolet(module);
            return `libs/${module}/application/src/lib/facades/${volet}-${module}.facade.ts`;
        },
        layer: 'application',
        oracle: ['@cmz/processing-application:build'],
        notes: 'facade.export(filter) — volet queues référence',
    },
    'list-export-ui-util': {
        legacy: () => 'src/shared/domain/services/excel-export.service.ts',
        nx: ({ module }) =>
            `libs/${module}/ui/src/lib/utils/${module}-list-export.util.ts`,
        layer: 'ui',
        oracle: ['@cmz/processing-ui:build'],
        notes: 'Util export listes — fetchRows via facade.export + ExcelExportPort (remplace exportData inline legacy)',
    },
    'list-export-shared-port': {
        legacy: () => 'src/shared/domain/interfaces/export-config.interface.ts',
        nx: () => 'libs/shared/domain/src/lib/ports/excel-export.port.ts',
        layer: 'domain',
        oracle: ['@cmz/processing-domain:build'],
        notes: 'ExcelExportPort + ExportColumn — vérifié via build module consommateur (requests-domain importe le port)',
    },
    'list-export-shared-adapter': {
        legacy: () => 'src/shared/domain/services/excel-export.service.ts',
        nx: () =>
            'libs/shared/browser/src/lib/export/browser-excel-export.adapter.ts',
        layer: 'app',
        oracle: ['@cmz/processing-ui:build'],
        notes: 'BrowserExcelExportAdapter (ExcelJS) — câblé app.config ; oracle via build UI consommateur',
    },
    'list-export-table-util': {
        legacy: () => 'src/shared/domain/services/excel-export.service.ts',
        nx: () => 'libs/shared/ui/src/lib/utils/export-table-to-excel.util.ts',
        layer: 'ui',
        oracle: ['@cmz/processing-ui:build'],
        notes: 'Helper générique colonnes/lignes → ExcelExportPort',
    },
    // --- requests.details.permissions ---
    'details-permissions-approve-legacy': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'domain/functions/details/details-permissions-approve.function.ts'
            ),
        nx: ({ module }) =>
            detailsDomainNxPath(
                module,
                `libs/${module}/domain/src/lib/utils/${modDetails(module)}-permissions.util.ts`,
                'utils/workflow-details-permissions.util.ts'
            ),
        layer: 'domain',
        oracle: ['@cmz/processing-domain:build', '@cmz/processing-domain:test'],
        notes: 'requestsDetailsPermissionsQualify — IN_PROGRESS + qualificationState pending + permission',
    },
    'details-permissions-reject-legacy': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'domain/functions/details/details-permissions-reject.function.ts'
            ),
        nx: ({ module }) =>
            detailsDomainNxPath(
                module,
                `libs/${module}/domain/src/lib/utils/${modDetails(module)}-permissions.util.ts`,
                'utils/workflow-details-permissions.util.ts'
            ),
        layer: 'domain',
        oracle: ['@cmz/processing-domain:build', '@cmz/processing-domain:test'],
        notes: 'requestsDetailsPermissionsReject + RejectContext — IN_PROGRESS ; reject sans qualificationState pending',
    },
    'details-permissions-manage-legacy': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'domain/functions/details/details-permissions-manage.function.ts'
            ),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        notes: 'Legacy commenté / non utilisé — logique absorbée par permissions.util + label.util Nx',
    },
    'details-permissions-spec': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'domain/functions/details/details-permissions-take.function.ts'
            ),
        nx: ({ module }) =>
            detailsDomainNxPath(
                module,
                `libs/${module}/domain/src/lib/utils/${modDetails(module)}-permissions.util.spec.ts`,
                'utils/workflow-details-permissions.util.spec.ts'
            ),
        layer: 'domain',
        oracle: ['@cmz/processing-domain:test'],
        notes: 'Oracle edge cases take/qualify/reject',
    },
    'list-rbac-paths': {
        legacy: ({ module }) => legacyPage(module, `${module}.routes.ts`),
        nx: ({ module }) =>
            `libs/${module}/domain/src/lib/constants/${module}-rbac-paths.constant.ts`,
        layer: 'domain',
        oracle: ['@cmz/processing-domain:build'],
        notes: 'Chemins RBAC /requests/queues|tasks|all + re-export UI requests-paths.constant',
    },
    'page-permission-take': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'presentation/features/queues/queues.component.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/ui/src/lib/features/queues-${module}-page.component.ts`,
        layer: 'ui',
        oracle: ['@cmz/processing-ui:build'],
        notes: 'PermissionActionsService.can(/requests/queues, take) — bloque action + toast',
    },
    'page-permission-qualify': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'presentation/features/tasks/tasks.component.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/ui/src/lib/features/tasks-${module}-page.component.ts`,
        layer: 'ui',
        oracle: ['@cmz/processing-ui:build'],
        notes: 'PermissionActionsService.can(/requests/tasks, approve) — ouvre dialog qualification',
    },
    'page-permission-export': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'presentation/features/queues/queues.component.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/ui/src/lib/features/queues-${module}-page.component.ts`,
        layer: 'ui',
        oracle: ['@cmz/processing-ui:build'],
        notes: 'can(export) + exportDisabled(total) — tooltip nb lignes filtrées (pas page courante)',
    },
    // --- requests.details.qualification — edit|callback ---
    'details-qualification-contract': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'application/dto/details/details-approve.dto.ts'
            ),
        nx: ({ module }) =>
            detailsDomainNxPath(
                module,
                `libs/${module}/domain/src/lib/contracts/${modDetails(module)}-qualification.contract.ts`,
                'contracts/workflow-details-qualification.contract.ts'
            ),
        layer: 'domain',
        oracle: ['@cmz/processing-domain:build'],
        notes: 'Contract unifié accept/reject + editFields — remplace DetailsApproveDto + DetailsRejectDto',
    },
    'details-approve-vo-legacy': {
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
        notes: 'approvalType edit|callback|view + callbackType + editFields validation',
    },
    'details-reject-vo-legacy': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'domain/value-objects/details/details-reject.vo.ts'
            ),
        nx: ({ module }) =>
            detailsDomainNxPath(
                module,
                `libs/${module}/domain/src/lib/value-objects/${modDetails(module)}-qualification.vo.ts`,
                'value-objects/workflow-details-qualification.vo.ts'
            ),
        layer: 'domain',
        oracle: ['@cmz/processing-domain:build', '@cmz/processing-domain:test'],
        notes: 'Reject absorbé dans requestsDetailsQualificationVo (decision rejected)',
    },
    'details-qualification-vo-spec': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'domain/value-objects/details/details-approve.vo.ts'
            ),
        nx: ({ module }) =>
            detailsDomainNxPath(
                module,
                `libs/${module}/domain/src/lib/value-objects/${modDetails(module)}-qualification.vo.spec.ts`,
                'value-objects/workflow-details-qualification.vo.spec.ts'
            ),
        layer: 'domain',
        oracle: ['@cmz/processing-domain:test'],
        notes: 'Oracle edit|callback : callbackType requis, editFields + commentaire edit',
    },
    'details-approve-entity-edit': {
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
        oracle: ['@cmz/requests-domain:build', '@cmz/requests-domain:test'],
        notes: 'fromDetails() applique editFields si approvalType=edit|callback',
    },
    'details-approve-entity-spec': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'domain/entities/details/details-approve.entity.ts'
            ),
        nx: ({ module }) =>
            detailsDomainNxPath(
                module,
                `libs/${module}/domain/src/lib/entities/${modDetails(module)}-approve.entity.spec.ts`,
                'entities/workflow-details-approve.entity.spec.ts'
            ),
        layer: 'domain',
        oracle: ['@cmz/processing-domain:test'],
        notes: 'Spec mode edit — champs fiche remplacés par editFields',
    },
    'details-approval-type-constants': {
        legacy: () =>
            'src/shared/components/management/presentation/management-callback/management-callback.component.ts',
        nx: ({ module }) =>
            `libs/${module}/ui/src/lib/constants/${modDetails(module)}-approval-type.constant.ts`,
        layer: 'ui',
        oracle: ['@cmz/processing-ui:build'],
        notes: 'view | edit | callback — wire MANAGEMENT.TREATMENT.CALLBACK_ACTION',
    },
    'details-callback-type-constants': {
        legacy: () =>
            'src/shared/components/management/presentation/management-callback/management-callback.component.ts',
        nx: ({ module }) =>
            `libs/${module}/ui/src/lib/constants/${modDetails(module)}-callback-type.constant.ts`,
        layer: 'ui',
        oracle: ['@cmz/processing-ui:build'],
        notes: 'Types callback — requis si approvalType=callback',
    },
};
