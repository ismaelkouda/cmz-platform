import { Observable } from 'rxjs';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import { AllFinalizationEntity } from '../entities/all-finalization.entity';
import { AllFinalizationFilterContract } from '../contracts/all-finalization-filter.contract';

export abstract class AllFinalizationRepository {
    abstract execute(
        validContract: AllFinalizationFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<AllFinalizationEntity>>;

    abstract export(
        validContract: AllFinalizationFilterContract,
        options?: FetchOptions
    ): Observable<AllFinalizationEntity[]>;
}
