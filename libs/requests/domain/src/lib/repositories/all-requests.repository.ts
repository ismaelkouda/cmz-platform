import { Observable } from 'rxjs';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import { AllRequestsEntity } from '../entities/all-requests.entity';
import { AllRequestsFilterContract } from '../contracts/all-requests-filter.contract';

export abstract class AllRequestsRepository {
    abstract execute(
        validContract: AllRequestsFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<AllRequestsEntity>>;

    abstract export(
        validContract: AllRequestsFilterContract,
        options?: FetchOptions
    ): Observable<AllRequestsEntity[]>;
}
