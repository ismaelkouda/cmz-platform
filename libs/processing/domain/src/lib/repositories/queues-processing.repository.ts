import { Observable } from 'rxjs';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import { QueuesProcessingFilterContract } from '../contracts/queues-processing-filter.contract';
import { QueuesProcessingEntity } from '../entities/queues-processing.entity';

export abstract class QueuesProcessingRepository {
    abstract execute(
        filter: QueuesProcessingFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<QueuesProcessingEntity>>;

    /** Export métier — même filtre/RBAC que la liste, sans pagination UI. */
    abstract export(
        filter: QueuesProcessingFilterContract,
        options?: FetchOptions
    ): Observable<QueuesProcessingEntity[]>;
}
