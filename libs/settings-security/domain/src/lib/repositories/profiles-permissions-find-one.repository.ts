import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { ProfilesPermissionsFindOneEntity } from '../entities/profiles-permissions-find-one.entity';
import { ProfilesPermissionsFindOneFilterValidateContract } from '../contracts/profiles-permissions-find-one-filter.validate-contract';

export abstract class ProfilesPermissionsFindOneRepository {
    abstract execute(
        filter: ProfilesPermissionsFindOneFilterValidateContract,
        options?: FetchOptions
    ): Observable<ProfilesPermissionsFindOneEntity>;
}
