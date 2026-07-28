import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { DashboardFilterValidateContract } from '../contracts/dashboard-filter.validate-contract';
import { DashboardEntity } from '../entities/dashboard.entity';

export abstract class DashboardRepository {
    abstract execute(
        filter: DashboardFilterValidateContract,
        options?: FetchOptions
    ): Observable<DashboardEntity>;
}
