import { Service, inject } from '@angular/core';
import { TeamsSelectRepository } from '@cmz/team-organization-domain';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { map, Observable } from 'rxjs';
import { TeamsSelectMapper } from '../mappers/teams-select.mapper';
import { TeamsSelectApi } from '../sources/teams-select.api';

@Service()
export class TeamsSelectRepositoryImpl implements TeamsSelectRepository {
    private readonly api = inject(TeamsSelectApi);
    private readonly mapper = inject(TeamsSelectMapper);

    readAll(options?: FetchOptions): Observable<SelectOption[]> {
        return this.api
            .readAll(options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
