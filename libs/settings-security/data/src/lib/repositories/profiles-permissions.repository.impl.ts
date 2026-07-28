import { Service, inject } from '@angular/core';
import {
    ProfilesPermissionsCreateValidateContract,
    ProfilesPermissionsDeleteValidateContract,
    ProfilesPermissionsDisableValidateContract,
    ProfilesPermissionsEntity,
    ProfilesPermissionsFilterContract,
    ProfilesPermissionsEnableValidateContract,
    ProfilesPermissionsRepository,
    ProfilesPermissionsUpdateValidateContract,
} from '@cmz/settings-security-domain';
import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import { MessageResultMapper } from '@cmz/shared-data';
import { map, Observable } from 'rxjs';
import { profilesPermissionsCreateMapper } from '../mappers/profiles-permissions-create.mapper';
import { profilesPermissionsUpdateMapper } from '../mappers/profiles-permissions-update.mapper';
import { profilesPermissionsDeleteMapper } from '../mappers/profiles-permissions-delete.mapper';
import { profilesPermissionsEnableMapper } from '../mappers/profiles-permissions-enable.mapper';
import { profilesPermissionsDisableMapper } from '../mappers/profiles-permissions-disable.mapper';
import { ProfilesPermissionsFilterMapper } from '../mappers/profiles-permissions-filter.mapper';
import { ProfilesPermissionsMapper } from '../mappers/profiles-permissions.mapper';
import { ProfilesPermissionsApi } from '../sources/profiles-permissions.api';

@Service()
export class ProfilesPermissionsRepositoryImpl implements ProfilesPermissionsRepository {
    private readonly api = inject(ProfilesPermissionsApi);
    private readonly mapper = inject(ProfilesPermissionsMapper);
    private readonly messageMapper = inject(MessageResultMapper);
    private readonly filterMapper = inject(ProfilesPermissionsFilterMapper);

    execute(
        filter: ProfilesPermissionsFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<ProfilesPermissionsEntity>> {
        return this.api
            .readAll(this.filterMapper.mapContractToApi(filter), page, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }

    create(
        validContract: ProfilesPermissionsCreateValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .create(profilesPermissionsCreateMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    update(
        validContract: ProfilesPermissionsUpdateValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .update(profilesPermissionsUpdateMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    delete(
        validContract: ProfilesPermissionsDeleteValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .delete(profilesPermissionsDeleteMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    enable(
        validContract: ProfilesPermissionsEnableValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .enable(profilesPermissionsEnableMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    disable(
        validContract: ProfilesPermissionsDisableValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .disable(profilesPermissionsDisableMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }
}
