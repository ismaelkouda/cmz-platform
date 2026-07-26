import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { RegionFindOneFilterValidateContract } from '../contracts/region-find-one-filter.validate-contract';
import { RegionFindOneEntity } from '../entities/region-find-one.entity';

export abstract class RegionFindOneRepository {
    abstract execute(
        filter: RegionFindOneFilterValidateContract,
        options?: FetchOptions
    ): Observable<RegionFindOneEntity>;
}
