import { Observable } from 'rxjs';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import { AllProcessingFilterContract } from '../contracts/all-processing-filter.contract';
import { AllProcessingEntity } from '../entities/all-processing.entity';

export abstract class AllProcessingRepository {
    abstract execute(
        filter: AllProcessingFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<AllProcessingEntity>>;

    abstract export(
        filter: AllProcessingFilterContract,
        options?: FetchOptions
    ): Observable<AllProcessingEntity[]>;
}
