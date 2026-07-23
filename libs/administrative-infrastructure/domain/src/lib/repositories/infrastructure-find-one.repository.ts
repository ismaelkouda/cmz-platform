import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { InfrastructureFindOneFilterValidateContract } from '../contracts/infrastructure-find-one-filter.validate-contract';
import { InfrastructureFindOneEntity } from '../entities/infrastructure-find-one.entity';

export abstract class InfrastructureFindOneRepository {
    abstract execute(
        filter: InfrastructureFindOneFilterValidateContract,
        options?: FetchOptions
    ): Observable<InfrastructureFindOneEntity>;
}
