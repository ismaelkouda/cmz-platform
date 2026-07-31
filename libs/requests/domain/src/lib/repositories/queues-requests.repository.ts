import { Observable } from 'rxjs';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import { QueuesRequestsEntity } from '../entities/queues-requests.entity';
import { QueuesRequestsFilterContract } from '../contracts/queues-requests-filter.contract';

export abstract class QueuesRequestsRepository {
    abstract execute(
        validContract: QueuesRequestsFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<QueuesRequestsEntity>>;

    /** Export métier — même filtre/RBAC que la liste, sans pagination UI. */
    abstract export(
        validContract: QueuesRequestsFilterContract,
        options?: FetchOptions
    ): Observable<QueuesRequestsEntity[]>;
}
