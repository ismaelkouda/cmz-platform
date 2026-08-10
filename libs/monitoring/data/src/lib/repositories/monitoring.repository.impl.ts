import { Service, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { FetchOptions, GrafanaLinkEntity } from '@cmz/shared-domain';
import {
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
    ): Observable<GrafanaLinkEntity> {
        const mapper = new GrafanaDashboardMapper(section);
        return this.api
            .getVariables(options)
            .pipe(map((response) => mapper.mapFromDto(response)));
    }
}
