import { Provider } from '@angular/core';
import { MonitoringRepository } from '@cmz/monitoring-domain';
import { MonitoringRepositoryImpl } from '@cmz/monitoring-data';

/**
 * Composition root du module `monitoring` : un seul port (`MonitoringRepository`)
 * même si 4 pages le consomment (`NodeFacade`/`ServicesFacade`/
 * `ResourcesFacade`/`JobsFacade`), cf. doc module.
 */
export function provideMonitoring(): Provider[] {
    return [
        { provide: MonitoringRepository, useClass: MonitoringRepositoryImpl },
    ];
}
