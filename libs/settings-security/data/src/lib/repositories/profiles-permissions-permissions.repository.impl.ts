import { Service, inject } from '@angular/core';
import {
    PermissionTreeNode,
    ProfilesPermissionsPermissionsRepository,
} from '@cmz/settings-security-domain';
import { FetchOptions } from '@cmz/shared-domain';
import { map, Observable } from 'rxjs';
import { ProfilesPermissionsPermissionsMapper } from '../mappers/profiles-permissions-permissions.mapper';
import { ProfilesPermissionsPermissionsApi } from '../sources/profiles-permissions-permissions.api';

@Service()
export class ProfilesPermissionsPermissionsRepositoryImpl implements ProfilesPermissionsPermissionsRepository {
    private readonly api = inject(ProfilesPermissionsPermissionsApi);
    private readonly mapper = inject(ProfilesPermissionsPermissionsMapper);

    readAll(options?: FetchOptions): Observable<PermissionTreeNode[]> {
        return this.api
            .readAll(options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
