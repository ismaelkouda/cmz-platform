import { ResourcesFindOneEntity } from '@pages/seos-reference/domain/entities/resources/resources-find-one.entity';
import { ResourcesFindOneFilterValidateContract } from '@pages/seos-reference/domain/contracts/resources/resources-find-one-filter.validate-contract';
import { FetchOptions } from '@shared/interface/fetch-options.interface';
import { Observable } from 'rxjs';

export abstract class ResourcesFindOneRepository {
    abstract execute(
        validContract: ResourcesFindOneFilterValidateContract,
        options?: FetchOptions
    ): Observable<ResourcesFindOneEntity>;
}
