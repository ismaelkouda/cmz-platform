import { Service, inject } from '@angular/core';
import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import {
    ProfilesPermissionsCreateContract,
    ProfilesPermissionsDeleteContract,
    ProfilesPermissionsDisableContract,
    ProfilesPermissionsEnableContract,
    ProfilesPermissionsEntity,
    ProfilesPermissionsFilterContract,
    ProfilesPermissionsRepository,
    ProfilesPermissionsUpdateContract,
    profilesPermissionsCreateVo,
    profilesPermissionsDeleteVo,
    profilesPermissionsDisableVo,
    profilesPermissionsEnableVo,
    profilesPermissionsFilterEntity,
    profilesPermissionsFilterVo,
    profilesPermissionsUpdateVo,
} from '@cmz/settings-security-domain';
import { Observable, defer } from 'rxjs';

@Service()
export class ProfilesPermissionsUseCase {
    private readonly repository = inject(ProfilesPermissionsRepository);

    execute(
        contract: ProfilesPermissionsFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<ProfilesPermissionsEntity>> {
        return defer(() =>
            this.repository.execute(
                profilesPermissionsFilterEntity(
                    profilesPermissionsFilterVo(contract)
                ),
                page,
                options
            )
        );
    }

    create(
        contract: ProfilesPermissionsCreateContract
    ): Observable<MessageEntity> {
        return defer(() =>
            this.repository.create(profilesPermissionsCreateVo(contract))
        );
    }

    update(
        contract: ProfilesPermissionsUpdateContract
    ): Observable<MessageEntity> {
        return defer(() =>
            this.repository.update(profilesPermissionsUpdateVo(contract))
        );
    }

    delete(
        contract: ProfilesPermissionsDeleteContract
    ): Observable<MessageEntity> {
        return defer(() =>
            this.repository.delete(profilesPermissionsDeleteVo(contract))
        );
    }

    enable(
        contract: ProfilesPermissionsEnableContract
    ): Observable<MessageEntity> {
        return defer(() =>
            this.repository.enable(profilesPermissionsEnableVo(contract))
        );
    }

    disable(
        contract: ProfilesPermissionsDisableContract
    ): Observable<MessageEntity> {
        return defer(() =>
            this.repository.disable(profilesPermissionsDisableVo(contract))
        );
    }
}
