import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { HomeFindOneEntity } from '../entities/home-find-one.entity';
import { HomeFindOneFilterValidateContract } from '../contracts/home-find-one-filter.validate-contract';

export abstract class HomeFindOneRepository {
    abstract execute(
        filter: HomeFindOneFilterValidateContract,
        options?: FetchOptions
    ): Observable<HomeFindOneEntity>;
}
