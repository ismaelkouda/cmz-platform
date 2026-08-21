import { Provider } from '@angular/core';
import { MonitoringRepository } from '@cmz/monitoring-domain';
import { MonitoringRepositoryImpl } from '@cmz/monitoring-data';
import {
    JobsFacade,
    MonitoringUseCase,
    NodeFacade,
    ResourcesFacade,
    ServicesFacade,
} from '@cmz/monitoring-application';

/**
 * Composition root du module `monitoring` : un seul port (`MonitoringRepository`)
 * même si 4 pages le consomment (`NodeFacade`/`ServicesFacade`/
 * `ResourcesFacade`/`JobsFacade`), cf. doc module.
 *
 * OPS-25bis : `MonitoringUseCase` et les 4 façades sont passés à
 * `@Service({ autoProvided: false })` (voir leurs docstrings) car ils
 * dépendent transitivement de `MonitoringRepository`, qui n'est plus fourni
 * en root depuis la migration lazy-provider. Fournis ici explicitement, dans
 * le même injecteur que le repository.
 */
export function provideMonitoring(): Provider[] {
    return [
        { provide: MonitoringRepository, useClass: MonitoringRepositoryImpl },
        MonitoringUseCase,
        NodeFacade,
        JobsFacade,
        ResourcesFacade,
        ServicesFacade,
    ];
}
