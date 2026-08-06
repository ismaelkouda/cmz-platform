/**
 * NODE_MAPPINGS pack 1/4 — règles legacy→Nx workflow-action.
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
export const NODE_MAPPINGS_PACK_1 = {
    'list-item-props': {
        legacy: ({ module, volet }) =>
            legacyPage(
                module,
                `domain/interfaces/${volet}/${volet}-props.interface.ts`
            ),
        nx: ({ volet, module }) =>
            `libs/${module}/domain/src/lib/props/${volet}-${module}.props.ts`,
        layer: 'domain',
        oracle: ['@cmz/processing-domain:build'],
    },
    'list-item-entity': {
        legacy: ({ module, volet }) =>
            legacyPage(module, `domain/entities/${volet}/${volet}.entity.ts`),
        nx: ({ volet, module }) =>
            `libs/${module}/domain/src/lib/entities/${volet}-${module}.entity.ts`,
        layer: 'domain',
        oracle: ['@cmz/processing-domain:build'],
    },
    'filter-props': {
        legacy: ({ module, volet }) =>
            legacyPage(
                module,
                `domain/interfaces/${volet}/${volet}-filter-props.interface.ts`
            ),
        nx: () => null,
        layer: 'domain',
        statusOverride: 'n/a',
        notes: 'Props filtre fusionnées dans contracts + {Volet}{Module}FilterContract par volet',
        assumption_ref: 'A-2026-07-30-03',
    },
    'filter-entity': {
        legacy: ({ module, volet }) =>
            legacyPage(
                module,
                `domain/entities/${volet}/${volet}-filter.entity.ts`
            ),
        nx: ({ volet, module }) =>
            `libs/${module}/domain/src/lib/entities/${volet}-${module}-filter.entity.ts`,
        layer: 'domain',
        oracle: ['@cmz/processing-domain:build'],
    },
    'filter-contract': {
        legacy: ({ module, volet }) =>
            legacyPage(
                module,
                `application/dto/${volet}/${volet}-filter.dto.ts`
            ),
        nx: ({ volet, module }) =>
            `libs/${module}/domain/src/lib/contracts/${volet}-${module}-filter.contract.ts`,
        layer: 'domain',
        notes: 'Contract domaine remplace filter DTO application legacy',
        oracle: ['@cmz/processing-domain:build'],
    },
    'filter-vo': {
        legacy: ({ module, volet }) =>
            legacyPage(
                module,
                `domain/value-objects/${volet}/${volet}-filter.vo.ts`
            ),
        nx: ({ volet, module }) =>
            `libs/${module}/domain/src/lib/value-objects/${volet}-${module}-filter.vo.ts`,
        layer: 'domain',
        oracle: ['@cmz/processing-domain:build'],
    },
    'repository-port': {
        legacy: ({ module, volet }) =>
            legacyPage(
                module,
                `domain/repositories/${volet}/${volet}.repository.ts`
            ),
        nx: ({ volet, module }) =>
            `libs/${module}/domain/src/lib/repositories/${volet}-${module}.repository.ts`,
        layer: 'domain',
        oracle: ['@cmz/processing-domain:build'],
    },
    'item-api-dto': {
        legacy: ({ module, volet }) =>
            legacyPage(
                module,
                `infrastructure/api/dto/${volet}/${volet}-response-api.dto.ts`
            ),
        nx: ({ volet, module }) =>
            `libs/${module}/data/src/lib/dtos/${volet}-${module}-response-api.dto.ts`,
        layer: 'data',
        oracle: ['@cmz/processing-data:build'],
    },
    'filter-api-dto': {
        legacy: ({ module, volet }) =>
            legacyPage(
                module,
                `infrastructure/api/dto/${volet}/${volet}-filter-api.dto.ts`
            ),
        nx: ({ volet, module }) =>
            `libs/${module}/data/src/lib/dtos/${volet}-${module}-filter-api.dto.ts`,
        layer: 'data',
        oracle: ['@cmz/processing-data:build'],
    },
    'item-mapper': {
        legacy: ({ module, volet }) =>
            legacyPage(
                module,
                `infrastructure/data/mappers/${volet}/${volet}.mapper.ts`
            ),
        nx: ({ volet, module }) =>
            `libs/${module}/data/src/lib/mappers/${volet}-${module}-item.mapper.ts`,
        layer: 'data',
        oracle: ['@cmz/processing-data:build', '@cmz/processing-data:test'],
    },
    'filter-mapper': {
        legacy: ({ module, volet }) =>
            legacyPage(
                module,
                `infrastructure/data/mappers/${volet}/${volet}-filter.mapper.ts`
            ),
        nx: ({ volet, module }) =>
            `libs/${module}/data/src/lib/mappers/${volet}-${module}-filter.mapper.ts`,
        layer: 'data',
        oracle: ['@cmz/processing-data:build', '@cmz/processing-data:test'],
    },
    'api-source': {
        legacy: ({ module, volet }) =>
            legacyPage(
                module,
                `infrastructure/data/sources/${volet}/${volet}.api.ts`
            ),
        nx: ({ volet, module }) =>
            `libs/${module}/data/src/lib/sources/${volet}-${module}.api.ts`,
        layer: 'data',
        oracle: ['@cmz/processing-data:build'],
    },
    'repository-impl': {
        legacy: ({ module, volet }) =>
            legacyPage(
                module,
                `infrastructure/data/repositories/${volet}/${volet}.repository.impl.ts`
            ),
        nx: ({ volet, module }) =>
            `libs/${module}/data/src/lib/repositories/${volet}-${module}.repository.impl.ts`,
        layer: 'data',
        oracle: ['@cmz/processing-data:build'],
    },
    'use-case': {
        legacy: ({ module, volet }) =>
            legacyPage(
                module,
                `application/use-cases/${volet}/${volet}.use-case.ts`
            ),
        nx: ({ volet, module }) =>
            `libs/${module}/application/src/lib/use-cases/${volet}-${module}.use-case.ts`,
        layer: 'application',
        oracle: [
            '@cmz/processing-application:build',
            '@cmz/processing-application:test',
        ],
    },
    facade: {
        legacy: ({ module, volet }) =>
            legacyPage(
                module,
                `application/services/${volet}/${volet}.facade.ts`
            ),
        nx: ({ volet, module }) =>
            `libs/${module}/application/src/lib/facades/${volet}-${module}.facade.ts`,
        layer: 'application',
        oracle: ['@cmz/processing-application:build'],
    },
    'page-component': {
        legacy: ({ module, volet }) =>
            legacyPage(
                module,
                `presentation/features/${volet}/${volet}.component.ts`
            ),
        nx: ({ volet, module }) =>
            `libs/${module}/ui/src/lib/features/${volet}-${module}-page.component.ts`,
        layer: 'ui',
        oracle: ['@cmz/processing-ui:build'],
    },
    presenter: {
        legacy: ({ module, volet }) =>
            legacyPage(
                module,
                `presentation/adapters/${volet}/${volet}-vm.presenter.ts`
            ),
        nx: ({ volet, module }) =>
            `libs/${module}/ui/src/lib/adapters/${volet}-${module}-vm.presenter.ts`,
        layer: 'ui',
        oracle: ['@cmz/processing-ui:build'],
    },
    'filter-store': {
        legacy: ({ module, volet }) =>
            legacyPage(
                module,
                `presentation/store/${volet}/${volet}-filter.store.ts`
            ),
        nx: ({ volet, module }) =>
            `libs/${module}/ui/src/lib/stores/${volet}-${module}-filter.store.ts`,
        layer: 'ui',
        oracle: ['@cmz/processing-ui:build'],
    },
    'table-constants': {
        legacy: ({ module, volet }) => {
            if (module === 'finalization') {
                const suffix =
                    volet === 'queues'
                        ? `${volet}-table.constant.ts`
                        : `${volet}-table.constants.ts`;
                return legacyPage(
                    module,
                    `domain/constants/${volet}/${suffix}`
                );
            }
            if (module === 'report-states') {
                const suffix =
                    volet === 'evaluate'
                        ? `${volet}-table.constant.ts`
                        : `${volet}-table.constants.ts`;
                return legacyPage(
                    module,
                    `presentation/adapters/${volet}/${suffix}`
                );
            }
            return volet === 'queues'
                ? legacyPage(
                      module,
                      `presentation/adapters/${volet}/${volet}-table.constant.ts`
                  )
                : legacyPage(
                      module,
                      `presentation/adapters/${volet}/${volet}-table.constants.ts`
                  );
        },
        nx: ({ volet, module }) =>
            `libs/${module}/ui/src/lib/constants/${volet}-${module}-table.constant.ts`,
        layer: 'ui',
        oracle: ['@cmz/processing-ui:build'],
    },
    'volet-providers-legacy': {
        legacy: ({ module, volet }) =>
            legacyPage(module, `di/${volet}/${volet}.providers.ts`),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        notes: (ctx) =>
            `Binding volet absorbé par provide${ctx.module.charAt(0).toUpperCase()}${ctx.module.slice(1)}() au composition root`,
        assumption_ref: 'A-2026-07-30-04',
    },
    'query-bus-legacy': {
        legacy: ({ module, volet }) =>
            legacyPage(
                module,
                `application/queries-bus/${volet}/${volet}.bus.ts`
            ),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        notes: 'CQRS bus remplacé par use-case direct en cible Nx',
        assumption_ref: 'A-2026-07-30-05',
    },
    'query-handler-legacy': {
        legacy: ({ module, volet }) =>
            legacyPage(
                module,
                `application/queries-handlers/${volet}/${volet}.handler.ts`
            ),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        assumption_ref: 'A-2026-07-30-05',
    },
    'query-legacy': {
        legacy: ({ module, volet }) =>
            legacyPage(
                module,
                `application/queries/${volet}/${volet}.query.ts`
            ),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        assumption_ref: 'A-2026-07-30-05',
    },
    'query-mapper-legacy': {
        legacy: ({ module, volet }) =>
            legacyPage(
                module,
                `application/queries-mappers/${volet}/${volet}.mapper.ts`
            ),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        assumption_ref: 'A-2026-07-30-05',
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
        oracle: ['@cmz/processing-ui:build'],
    },
    'module-endpoints': {
        legacy: ({ module }) =>
            legacyPage(module, `infrastructure/api/${module}.endpoints.ts`),
        nx: ({ module }) =>
            `libs/${module}/data/src/lib/endpoints/${module}.endpoints.ts`,
        layer: 'data',
        oracle: ['@cmz/processing-data:build'],
    },
    'module-providers-nx': {
        legacy: ({ module }) => legacyPage(module, `di/${module}.providers.ts`),
        nx: ({ module }) =>
            `apps/backoffice-angular/src/app/providers/${module}.providers.ts`,
        layer: 'app',
        oracle: (ctx) => [
            `@cmz/${ctx.module}-domain:build`,
            `@cmz/${ctx.module}-data:build`,
            `@cmz/${ctx.module}-application:build`,
        ],
        notes: 'Oracle Tier 1 module (A-2026-07-30-08) — backoffice-angular:build = Tier 2 intégration',
        assumption_ref: 'A-2026-07-30-08',
    },
    'module-providers-legacy': {
        legacy: ({ module }) => legacyPage(module, `di/${module}.providers.ts`),
        nx: () => null,
        layer: 'legacy-only',
        statusOverride: 'n/a',
        notes: 'DI module → composition root app en Nx',
    },
    // --- sous-graphe details (tranche B) ---
    'details-props': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'domain/interfaces/details/details-props.interface.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/domain/src/lib/props/${modDetails(module)}.props.ts`,
        layer: 'domain',
        oracle: ['@cmz/processing-domain:build'],
    },
    'details-entity': {
        legacy: ({ module }) =>
            legacyPage(module, 'domain/entities/details/details.entity.ts'),
        nx: ({ module }) =>
            `libs/${module}/domain/src/lib/entities/${modDetails(module)}.entity.ts`,
        layer: 'domain',
        oracle: ['@cmz/processing-domain:build'],
    },
    'details-filter-entity': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'domain/entities/details/details-filter.entity.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/domain/src/lib/entities/${modDetails(module)}-filter.entity.ts`,
        layer: 'domain',
        oracle: ['@cmz/processing-domain:build'],
    },
    'details-filter-contract': {
        legacy: ({ module }) =>
            legacyPage(module, 'application/dto/details/details-filter.dto.ts'),
        nx: ({ module }) =>
            `libs/${module}/domain/src/lib/contracts/${modDetails(module)}-filter.contract.ts`,
        layer: 'domain',
        notes: 'Contract domaine remplace filter DTO application legacy',
        oracle: ['@cmz/processing-domain:build'],
    },
    'details-filter-vo': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'domain/value-objects/details/details-filter.vo.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/domain/src/lib/value-objects/${modDetails(module)}-filter.vo.ts`,
        layer: 'domain',
        oracle: ['@cmz/processing-domain:build'],
    },
    'details-take-entity': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'domain/entities/details/details-take.entity.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/domain/src/lib/entities/${modDetails(module)}-take.entity.ts`,
        layer: 'domain',
        oracle: ['@cmz/processing-domain:build'],
    },
    'details-treat-entity': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'domain/entities/details/details-treat.entity.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/domain/src/lib/entities/${modDetails(module)}-treat.entity.ts`,
        layer: 'domain',
        oracle: ['@cmz/processing-domain:build'],
    },
    'details-take-vo': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'domain/value-objects/details/details-take.vo.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/domain/src/lib/value-objects/${modDetails(module)}-take.vo.ts`,
        layer: 'domain',
        oracle: ['@cmz/processing-domain:build'],
    },
    'details-treat-vo': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'domain/value-objects/details/details-treat.vo.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/domain/src/lib/value-objects/${modDetails(module)}-treat.vo.ts`,
        layer: 'domain',
        oracle: ['@cmz/processing-domain:build'],
    },
    'details-repository-port': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'domain/repositories/details/details-repository.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/domain/src/lib/repositories/${modDetails(module)}.repository.ts`,
        layer: 'domain',
        oracle: ['@cmz/processing-domain:build'],
    },
    'details-api-dto': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'infrastructure/api/dto/details/details-response-api.dto.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/data/src/lib/dtos/${modDetails(module)}-api.dto.ts`,
        layer: 'data',
        oracle: ['@cmz/processing-data:build'],
    },
    'details-filter-api-dto': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'infrastructure/api/dto/details/details-filter-api.dto.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/data/src/lib/dtos/${modDetails(module)}-filter-api.dto.ts`,
        layer: 'data',
        oracle: ['@cmz/processing-data:build'],
    },
    'details-take-api-dto': {
        legacy: ({ module }) =>
            legacyPage(
                module,
                'infrastructure/api/dto/details/details-take-api.dto.ts'
            ),
        nx: ({ module }) =>
            `libs/${module}/data/src/lib/dtos/${modDetails(module)}-take-api.dto.ts`,
        layer: 'data',
        oracle: ['@cmz/processing-data:build'],
    },
};
