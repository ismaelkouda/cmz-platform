import { Provider } from '@angular/core';
import { DashboardRepository } from '@cmz/dashboard-domain';
import { DashboardRepositoryImpl } from '@cmz/dashboard-data';
import { DashboardFacade, DashboardUseCase } from '@cmz/dashboard-application';

/**
 * Composition root du module `dashboard` : wire le port domaine
 * (`DashboardRepository`) à son implémentation `data`. Même précédent que
 * `provideCommunication()`.
 *
 * OPS-25bis : `DashboardUseCase`/`DashboardFacade` sont passés à
 * `@Service({ autoProvided: false })` (voir leurs docstrings) car ils
 * dépendent transitivement de `DashboardRepository`, qui n'est plus fourni
 * en root depuis la migration lazy-provider. Fournis ici explicitement, dans
 * le même injecteur que le repository.
 */
export function provideDashboard(): Provider[] {
    return [
        { provide: DashboardRepository, useClass: DashboardRepositoryImpl },
        DashboardUseCase,
        DashboardFacade,
    ];
}
