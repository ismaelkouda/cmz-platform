import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { FetchOptions } from '@cmz/shared-domain';
import {
    GrafanaDashboardEntity,
    ReportingRepository,
    ReportingSection,
} from '@cmz/reporting-domain';
import { ReportingApi } from '../sources/reporting.api';
import { ReportingDashboardMapper } from '../mappers/reporting-dashboard.mapper';

@Service()
export class ReportingRepositoryImpl implements ReportingRepository {
    private readonly api = inject(ReportingApi);

    execute(
        section: ReportingSection,
        options?: FetchOptions
    ): Observable<GrafanaDashboardEntity> {
        const mapper = new ReportingDashboardMapper(section);
        return this.api
            .getVariables(options)
            .pipe(map((response) => mapper.mapFromDto(response)));
    }
}
