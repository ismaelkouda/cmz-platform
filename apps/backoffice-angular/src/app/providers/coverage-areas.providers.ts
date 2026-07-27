import { Provider } from '@angular/core';
import {
    FiberConstructorSelectRepository,
    MobileNetworkFindOneRepository,
    MobileNetworkRepository,
    OpticalFiberNetworkFindOneRepository,
    OpticalFiberNetworkRepository,
    SiteGroupFindOneRepository,
    SiteGroupRepository,
    SiteGroupSelectRepository,
    TowerTypeSelectRepository,
} from '@cmz/coverage-areas-domain';
import {
    FiberConstructorSelectRepositoryImpl,
    MobileNetworkFindOneRepositoryImpl,
    MobileNetworkRepositoryImpl,
    OpticalFiberNetworkFindOneRepositoryImpl,
    OpticalFiberNetworkRepositoryImpl,
    SiteGroupFindOneRepositoryImpl,
    SiteGroupRepositoryImpl,
    SiteGroupSelectRepositoryImpl,
    TowerTypeSelectRepositoryImpl,
} from '@cmz/coverage-areas-data';

/**
 * Composition root du module : wire les ports domaine à leurs implémentations
 * `data`. **À fournir au niveau app** (`app.config`) — les façades/use-cases sont
 * des singletons root, ils ne verraient pas des bindings route-scoped.
 */
export function provideCoverageAreas(): Provider[] {
    return [
        { provide: SiteGroupRepository, useClass: SiteGroupRepositoryImpl },
        {
            provide: SiteGroupFindOneRepository,
            useClass: SiteGroupFindOneRepositoryImpl,
        },
        {
            provide: SiteGroupSelectRepository,
            useClass: SiteGroupSelectRepositoryImpl,
        },
        {
            provide: MobileNetworkRepository,
            useClass: MobileNetworkRepositoryImpl,
        },
        {
            provide: MobileNetworkFindOneRepository,
            useClass: MobileNetworkFindOneRepositoryImpl,
        },
        {
            provide: TowerTypeSelectRepository,
            useClass: TowerTypeSelectRepositoryImpl,
        },
        {
            provide: OpticalFiberNetworkRepository,
            useClass: OpticalFiberNetworkRepositoryImpl,
        },
        {
            provide: OpticalFiberNetworkFindOneRepository,
            useClass: OpticalFiberNetworkFindOneRepositoryImpl,
        },
        {
            provide: FiberConstructorSelectRepository,
            useClass: FiberConstructorSelectRepositoryImpl,
        },
    ];
}
