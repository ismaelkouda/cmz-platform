/**
 * Règles de mapping legacy → Nx par nœud IR (workflow-action, list_volet).
 *
 * Placeholders ctx : { module, volet, Volet }
 * {volet} = queues | tasks | all
 */

/** @typedef {{ legacy: (ctx: Ctx) => string; nx: (ctx: Ctx) => string | null; layer: string; oracle?: string[] | ((ctx: Ctx) => string[]); statusOverride?: string; notes?: string | ((ctx: Ctx) => string); assumption_ref?: string }} NodeMapping */

/** @typedef {{ module: string; volet: string; Volet: string }} Ctx */

const VOLET_PASCAL = {
    queues: 'Queues',
    tasks: 'Tasks',
    all: 'All',
    approve: 'Approve',
    evaluate: 'Evaluate',
    close: 'Close',
    reject: 'Reject',
    download: 'Download',
};

/** @param {string} module @param {string} volet @returns {Ctx} */
export function makeCtx(module, volet) {
    return {
        module,
        volet,
        Volet: VOLET_PASCAL[volet] ?? volet,
    };
}

/** Volet référence export / details dialog par module workflow-action. */
function listExportRefVolet(module) {
    if (module === 'report-states') return 'approve';
    return 'queues';
}

/** @param {string} module @param {string} rel */
function legacyPage(module, rel) {
    return `src/presentation/pages/${module}/${rel}`;
}

/** @param {string} module @param {string} rel */
function legacyListExportPage(module, rel) {
    if (module === 'report-states') {
        return legacyPage(
            module,
            'presentation/features/approve/approve.component.ts'
        );
    }
    return legacyPage(module, rel);
}

/** @param {Ctx} ctx @param {string[] | ((ctx: Ctx) => string[])} oracle */
function resolveOracle(ctx, oracle) {
    if (!oracle) return undefined;
    if (typeof oracle === 'function') return oracle(ctx);
    return oracle.map((target) =>
        target.replace(/@cmz\/processing-/g, `@cmz/${ctx.module}-`)
    );
}

/** @param {string[] | ((ctx: Ctx) => string[])} oracle */
function moduleOracle(oracle) {
    return oracle;
}

/** @param {string} module */
function modDetails(module) {
    return `${module}-details`;
}

/** @type {Record<string, NodeMapping>} */
export const NODE_MAPPINGS = {
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
            `libs/${module}/domain/src/lib/entities/${modDetails(module)}-approve.entity.ts`,
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
            `libs/${module}/domain/src/lib/entities/${modDetails(module)}-reject.entity.ts`,
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
            `libs/${module}/domain/src/lib/value-objects/${modDetails(module)}-qualification.vo.ts`,
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
            `libs/${module}/domain/src/lib/utils/${modDetails(module)}-permissions.util.ts`,
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
            `libs/${module}/domain/src/lib/utils/${modDetails(module)}-label.util.ts`,
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
        nx: ({ module }) =>
            `libs/${module}/ui/src/lib/features/${modDetails(module)}-edit-fields.component.ts`,
        layer: 'ui',
        oracle: ['@cmz/processing-ui:build'],
        notes: 'Champs éditables approvalType=edit|callback (legacy champs éditables ManagementInfoPanel)',
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
            `libs/${module}/domain/src/lib/utils/${modDetails(module)}-permissions.util.ts`,
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
            `libs/${module}/domain/src/lib/utils/${modDetails(module)}-permissions.util.ts`,
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
            `libs/${module}/domain/src/lib/utils/${modDetails(module)}-permissions.util.spec.ts`,
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
            `libs/${module}/domain/src/lib/contracts/${modDetails(module)}-qualification.contract.ts`,
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
            `libs/${module}/domain/src/lib/value-objects/${modDetails(module)}-qualification.vo.ts`,
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
            `libs/${module}/domain/src/lib/value-objects/${modDetails(module)}-qualification.vo.ts`,
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
            `libs/${module}/domain/src/lib/value-objects/${modDetails(module)}-qualification.vo.spec.ts`,
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
            `libs/${module}/domain/src/lib/entities/${modDetails(module)}-approve.entity.ts`,
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
            `libs/${module}/domain/src/lib/entities/${modDetails(module)}-approve.entity.spec.ts`,
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

/** @param {import('./chains.mjs').ChainDef} chain @returns {string} */
function chainSegment(chain) {
    if (chain.volet) return chain.volet;
    if (chain.subgraph === 'details') return 'details';
    if (chain.subgraph === 'list_export') return 'export';
    if (chain.subgraph === 'tasks_actions') return 'tasks-actions';
    if (chain.subgraph === 'details_permissions') return 'permissions';
    if (chain.subgraph === 'details_qualification') return 'qualification';
    return 'shell';
}

/**
 * @param {string} module
 * @param {import('./chains.mjs').ChainDef} chain
 * @returns {import('./emit-pairs.mjs').CorpusPair[]}
 */
export function expandChain(module, chain) {
    const pattern = 'workflow-action';
    const pairs = [];
    const segment = chainSegment(chain);

    for (const node of chain.nodes) {
        const mapping = NODE_MAPPINGS[node];
        if (!mapping) {
            throw new Error(`Unknown node mapping: ${node}`);
        }

        const ctx = chain.volet
            ? makeCtx(module, chain.volet)
            : { module, volet: '', Volet: '' };
        const legacyPath = mapping.legacy(ctx);
        const nxPath = mapping.nx(ctx);
        const id = `${module}.${segment}.${node}`;
        const notes =
            typeof mapping.notes === 'function'
                ? mapping.notes(ctx)
                : mapping.notes;

        pairs.push({
            id,
            legacy: legacyPath,
            nx: nxPath,
            chain_id: chain.id,
            node,
            pattern,
            module,
            volet: chain.volet ?? undefined,
            layer: mapping.layer,
            status: mapping.statusOverride ?? 'pending',
            oracle: resolveOracle(ctx, mapping.oracle),
            notes,
            assumption_ref: mapping.assumption_ref,
        });
    }

    return pairs;
}
