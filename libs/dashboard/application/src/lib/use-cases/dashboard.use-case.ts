import { Service, inject } from '@angular/core';
import { FetchOptions } from '@cmz/shared-domain';
import {
    DashboardEntity,
    DashboardFilterContract,
    DashboardRepository,
    dashboardFilterVo,
} from '@cmz/dashboard-domain';
import { Observable, defer } from 'rxjs';

@Service()
export class DashboardUseCase {
    private readonly repository = inject(DashboardRepository);

    execute(
        contract: DashboardFilterContract,
        options?: FetchOptions
    ): Observable<DashboardEntity> {
        return defer(() =>
            this.repository.execute(dashboardFilterVo(contract), options)
        );
    }
}
