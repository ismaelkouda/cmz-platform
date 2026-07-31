import { Observable } from 'rxjs';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import { QueuesFinalizationEntity } from '../entities/queues-finalization.entity';
import { QueuesFinalizationFilterContract } from '../contracts/queues-finalization-filter.contract';

export abstract class QueuesFinalizationRepository {
    abstract execute(
        validContract: QueuesFinalizationFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<QueuesFinalizationEntity>>;

    /** Export métier — même filtre/RBAC que la liste, sans pagination UI. */
    abstract export(
        validContract: QueuesFinalizationFilterContract,
        options?: FetchOptions
    ): Observable<QueuesFinalizationEntity[]>;
}
