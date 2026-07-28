import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { ProfilesPermissionsEntity } from '../entities/profiles-permissions.entity';
import { ProfilesPermissionsCreateValidateContract } from '../contracts/profiles-permissions-create.validate-contract';
import { ProfilesPermissionsUpdateValidateContract } from '../contracts/profiles-permissions-update.validate-contract';
import { ProfilesPermissionsDeleteValidateContract } from '../contracts/profiles-permissions-delete.validate-contract';
import { ProfilesPermissionsEnableValidateContract } from '../contracts/profiles-permissions-enable.validate-contract';
import { ProfilesPermissionsDisableValidateContract } from '../contracts/profiles-permissions-disable.validate-contract';
import { ProfilesPermissionsFilterContract } from '../contracts/profiles-permissions-filter.contract';

export abstract class ProfilesPermissionsRepository {
    abstract execute(
        filter: ProfilesPermissionsFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<ProfilesPermissionsEntity>>;
    abstract create(
        contract: ProfilesPermissionsCreateValidateContract
    ): Observable<MessageEntity>;
    abstract update(
        contract: ProfilesPermissionsUpdateValidateContract
    ): Observable<MessageEntity>;
    abstract delete(
        contract: ProfilesPermissionsDeleteValidateContract
    ): Observable<MessageEntity>;
    abstract enable(
        contract: ProfilesPermissionsEnableValidateContract
    ): Observable<MessageEntity>;
    abstract disable(
        contract: ProfilesPermissionsDisableValidateContract
    ): Observable<MessageEntity>;
}
