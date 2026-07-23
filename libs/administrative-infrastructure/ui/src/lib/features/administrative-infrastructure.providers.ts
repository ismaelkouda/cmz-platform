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

/**
 * Composition root du module : wire les ports domaine à leurs implémentations
 * `data`. **À fournir au niveau app** (`app.config`) — les façades/use-cases sont
 * des singletons root, ils ne verraient pas des bindings route-scoped.
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
    ];
}
