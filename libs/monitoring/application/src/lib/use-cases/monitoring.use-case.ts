import { Service, inject } from '@angular/core';
import { Observable, defer } from 'rxjs';
import { FetchOptions } from '@cmz/shared-domain';
import {
    GrafanaDashboardEntity,
    MonitoringRepository,
    MonitoringSection,
} from '@cmz/monitoring-domain';

/**
 * Pas de validation ici : contrairement à `Period` (dashboard), la
 * `MonitoringSection` n'est jamais une saisie utilisateur — elle est fixée
 * par la façade concrète (une par page), donc déjà correcte par construction.
 */
@Service()
export class MonitoringUseCase {
    private readonly repository = inject(MonitoringRepository);

    execute(
        section: MonitoringSection,
        options?: FetchOptions
    ): Observable<GrafanaDashboardEntity> {
        return defer(() => this.repository.execute(section, options));
    }
}
