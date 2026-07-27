import { Provider } from '@angular/core';
import {
    SiteGroupFindOneRepository,
    SiteGroupRepository,
    SiteGroupSelectRepository,
} from '@cmz/coverage-areas-domain';
import {
    SiteGroupFindOneRepositoryImpl,
    SiteGroupRepositoryImpl,
    SiteGroupSelectRepositoryImpl,
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
    ];
}
