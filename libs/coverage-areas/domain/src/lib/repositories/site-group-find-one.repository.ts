import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { SiteGroupFindOneFilterValidateContract } from '../contracts/site-group-find-one-filter.validate-contract';
import { SiteGroupFindOneEntity } from '../entities/site-group-find-one.entity';

export abstract class SiteGroupFindOneRepository {
    abstract execute(
        filter: SiteGroupFindOneFilterValidateContract,
        options?: FetchOptions
    ): Observable<SiteGroupFindOneEntity>;
}
