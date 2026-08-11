import { Provider } from '@angular/core';
import {
    FiberConstructorSelectRepository,
    MobileNetworkFindOneRepository,
    MobileNetworkRepository,
    OpticalFiberNetworkFindOneRepository,
    OpticalFiberNetworkRepository,
    OpticalFiberNetworkSelectRepository,
    RadioRelayLinksFindOneRepository,
    RadioRelayLinksRepository,
    RadioRelayLinksSelectRepository,
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
    OpticalFiberNetworkSelectRepositoryImpl,
    RadioRelayLinksFindOneRepositoryImpl,
    RadioRelayLinksRepositoryImpl,
    RadioRelayLinksSelectRepositoryImpl,
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
            provide: OpticalFiberNetworkSelectRepository,
            useClass: OpticalFiberNetworkSelectRepositoryImpl,
        },
        {
            provide: FiberConstructorSelectRepository,
            useClass: FiberConstructorSelectRepositoryImpl,
        },
        {
            provide: RadioRelayLinksRepository,
            useClass: RadioRelayLinksRepositoryImpl,
        },
        {
            provide: RadioRelayLinksFindOneRepository,
            useClass: RadioRelayLinksFindOneRepositoryImpl,
        },
        {
            provide: RadioRelayLinksSelectRepository,
            useClass: RadioRelayLinksSelectRepositoryImpl,
        },
    ];
}
