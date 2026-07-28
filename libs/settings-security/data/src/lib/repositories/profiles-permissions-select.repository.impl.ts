import { Service, inject } from '@angular/core';
import { ProfilesPermissionsSelectRepository } from '@cmz/settings-security-domain';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { map, Observable } from 'rxjs';
import { ProfilesPermissionsSelectMapper } from '../mappers/profiles-permissions-select.mapper';
import { ProfilesPermissionsSelectApi } from '../sources/profiles-permissions-select.api';

@Service()
export class ProfilesPermissionsSelectRepositoryImpl implements ProfilesPermissionsSelectRepository {
    private readonly api = inject(ProfilesPermissionsSelectApi);
    private readonly mapper = inject(ProfilesPermissionsSelectMapper);

    readAll(options?: FetchOptions): Observable<SelectOption[]> {
        return this.api
            .readAll(options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
