import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { UsersFindOneEntity } from '../entities/users-find-one.entity';
import { UsersFindOneFilterValidateContract } from '../contracts/users-find-one-filter.validate-contract';

export abstract class UsersFindOneRepository {
    abstract execute(
        filter: UsersFindOneFilterValidateContract,
        options?: FetchOptions
    ): Observable<UsersFindOneEntity>;
}
