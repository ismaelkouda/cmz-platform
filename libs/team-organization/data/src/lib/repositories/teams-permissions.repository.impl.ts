import { Service, inject } from '@angular/core';
import {
    TeamsPermissionOption,
    TeamsPermissionsRepository,
} from '@cmz/team-organization-domain';
import { FetchOptions } from '@cmz/shared-domain';
import { map, Observable } from 'rxjs';
import { TeamsPermissionsMapper } from '../mappers/teams-permissions.mapper';
import { TeamsPermissionsApi } from '../sources/teams-permissions.api';

@Service()
export class TeamsPermissionsRepositoryImpl implements TeamsPermissionsRepository {
    private readonly api = inject(TeamsPermissionsApi);
    private readonly mapper = inject(TeamsPermissionsMapper);

    readAll(options?: FetchOptions): Observable<TeamsPermissionOption[]> {
        return this.api
            .readAll(options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
