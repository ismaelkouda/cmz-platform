import { Service, inject } from '@angular/core';
import {
    ProfilesPermissionsFindOneEntity,
    ProfilesPermissionsFindOneFilterValidateContract,
    ProfilesPermissionsFindOneRepository,
} from '@cmz/settings-security-domain';
import { FetchOptions } from '@cmz/shared-domain';
import { map, Observable } from 'rxjs';
import { profilesPermissionsFindOneFilterMapper } from '../mappers/profiles-permissions-find-one-filter.mapper';
import { ProfilesPermissionsFindOneMapper } from '../mappers/profiles-permissions-find-one.mapper';
import { ProfilesPermissionsFindOneApi } from '../sources/profiles-permissions-find-one.api';

@Service()
export class ProfilesPermissionsFindOneRepositoryImpl implements ProfilesPermissionsFindOneRepository {
    private readonly api = inject(ProfilesPermissionsFindOneApi);
    private readonly mapper = inject(ProfilesPermissionsFindOneMapper);

    execute(
        filter: ProfilesPermissionsFindOneFilterValidateContract,
        options?: FetchOptions
    ): Observable<ProfilesPermissionsFindOneEntity> {
        const dto = profilesPermissionsFindOneFilterMapper(filter);
        return this.api
            .execute(dto, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
