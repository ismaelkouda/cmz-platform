import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { InfrastructureTypeFindOneFilterValidateContract } from '../contracts/infrastructure-type-find-one-filter.validate-contract';
import { InfrastructureTypeFindOneEntity } from '../entities/infrastructure-type-find-one.entity';

export abstract class InfrastructureTypeFindOneRepository {
    abstract execute(
        filter: InfrastructureTypeFindOneFilterValidateContract,
        options?: FetchOptions
    ): Observable<InfrastructureTypeFindOneEntity>;
}
