import { Provider } from '@angular/core';
import { DashboardRepository } from '@cmz/dashboard-domain';
import { DashboardRepositoryImpl } from '@cmz/dashboard-data';

/**
 * Composition root du module `dashboard` : wire le port domaine
 * (`DashboardRepository`) à son implémentation `data`. Même précédent que
 * `provideCommunication()`.
 */
export function provideDashboard(): Provider[] {
    return [
        { provide: DashboardRepository, useClass: DashboardRepositoryImpl },
    ];
}
