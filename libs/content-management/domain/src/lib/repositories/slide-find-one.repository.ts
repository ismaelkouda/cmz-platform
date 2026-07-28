import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { SlideFindOneEntity } from '../entities/slide-find-one.entity';
import { SlideFindOneFilterValidateContract } from '../contracts/slide-find-one-filter.validate-contract';

export abstract class SlideFindOneRepository {
    abstract execute(
        filter: SlideFindOneFilterValidateContract,
        options?: FetchOptions
    ): Observable<SlideFindOneEntity>;
}
