import { Provider } from '@angular/core';
import {
    InfrastructureFindOneRepository,
    InfrastructureRepository,
    InfrastructureSelectRepository,
    InfrastructureTypeFindOneRepository,
    InfrastructureTypeRepository,
    InfrastructureTypeSelectRepository,
} from '@cmz/administrative-infrastructure-domain';
import {
    InfrastructureFindOneRepositoryImpl,
    InfrastructureRepositoryImpl,
    InfrastructureSelectRepositoryImpl,
    InfrastructureTypeFindOneRepositoryImpl,
    InfrastructureTypeRepositoryImpl,
    InfrastructureTypeSelectRepositoryImpl,
} from '@cmz/administrative-infrastructure-data';
import {
    InfrastructureFacade,
    InfrastructureFindOneFacade,
    InfrastructureFindOneUseCase,
    InfrastructureSelectFacade,
    InfrastructureSelectUseCase,
    InfrastructureTypeFacade,
    InfrastructureTypeFindOneFacade,
    InfrastructureTypeFindOneUseCase,
    InfrastructureTypeSelectFacade,
    InfrastructureTypeSelectUseCase,
    InfrastructureTypeUseCase,
    InfrastructureUseCase,
} from '@cmz/administrative-infrastructure-application';

/**
 * Composition root du module : wire les ports domaine à leurs implémentations
 * `data`, scopée à l'injecteur de route (`app.routes.ts`, `loadChildren`).
 *
 * OPS-25bis (2026-08-21) : le docstring précédent affirmait « à fournir au
 * niveau app, les façades/use-cases sont des singletons root » — c'était
 * décrit comme le plan avant la migration lazy-provider OPS-25, mais ce
 * module fait bien partie des 14 modules migrés en route-scoped (voir
 * `app.routes.ts`, `INFRASTRUCTURE_ROUTES`/`INFRASTRUCTURE_TYPE_ROUTES`) —
 * l'affirmation était donc fausse et non corrigée après la migration, même
 * bug que `authentication` (voir `provideAuthentication()` pour le pattern
 * de référence). Chaque `XxxUseCase`/`XxxFacade` du module est passé à
 * `@Service({ autoProvided: false })` (voir leurs docstrings) et fourni
 * explicitement ci-dessous, dans le même injecteur que leur `Repository`.
 */
export function provideAdministrativeInfrastructure(): Provider[] {
    return [
        {
            provide: InfrastructureTypeRepository,
            useClass: InfrastructureTypeRepositoryImpl,
        },
        {
            provide: InfrastructureTypeFindOneRepository,
            useClass: InfrastructureTypeFindOneRepositoryImpl,
        },
        {
            provide: InfrastructureTypeSelectRepository,
            useClass: InfrastructureTypeSelectRepositoryImpl,
        },
        {
            provide: InfrastructureRepository,
            useClass: InfrastructureRepositoryImpl,
        },
        {
            provide: InfrastructureFindOneRepository,
            useClass: InfrastructureFindOneRepositoryImpl,
        },
        {
            provide: InfrastructureSelectRepository,
            useClass: InfrastructureSelectRepositoryImpl,
        },
        InfrastructureTypeUseCase,
        InfrastructureTypeFindOneUseCase,
        InfrastructureTypeSelectUseCase,
        InfrastructureUseCase,
        InfrastructureFindOneUseCase,
        InfrastructureSelectUseCase,
        InfrastructureTypeFacade,
        InfrastructureTypeFindOneFacade,
        InfrastructureTypeSelectFacade,
        InfrastructureFacade,
        InfrastructureFindOneFacade,
        InfrastructureSelectFacade,
    ];
}
