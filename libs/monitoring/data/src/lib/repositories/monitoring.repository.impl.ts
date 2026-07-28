import { Service, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { FetchOptions } from '@cmz/shared-domain';
import {
    GrafanaDashboardEntity,
    MonitoringRepository,
    MonitoringSection,
} from '@cmz/monitoring-domain';
import { MonitoringApi } from '../sources/monitoring.api';
import { GrafanaDashboardMapper } from '../mappers/grafana-dashboard.mapper';

@Service()
export class MonitoringRepositoryImpl implements MonitoringRepository {
    private readonly api = inject(MonitoringApi);

    execute(
        section: MonitoringSection,
        options?: FetchOptions
    ): Observable<GrafanaDashboardEntity> {
        const mapper = new GrafanaDashboardMapper(section);
        return this.api
            .getVariables(options)
            .pipe(map((response) => mapper.mapFromDto(response)));
    }
}
