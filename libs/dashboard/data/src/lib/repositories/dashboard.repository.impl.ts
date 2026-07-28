import { Service, inject } from '@angular/core';
import {
    DashboardEntity,
    DashboardFilterValidateContract,
    DashboardRepository,
} from '@cmz/dashboard-domain';
import { FetchOptions } from '@cmz/shared-domain';
import { map, Observable } from 'rxjs';
import { dashboardFilterMapper } from '../mappers/dashboard-filter.mapper';
import { DashboardMapper } from '../mappers/dashboard.mapper';
import { DashboardApi } from '../sources/dashboard.api';

@Service()
export class DashboardRepositoryImpl implements DashboardRepository {
    private readonly api = inject(DashboardApi);
    private readonly mapper = inject(DashboardMapper);

    execute(
        filter: DashboardFilterValidateContract,
        options?: FetchOptions
    ): Observable<DashboardEntity> {
        const dto = dashboardFilterMapper(filter);
        return this.api
            .execute(dto, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
