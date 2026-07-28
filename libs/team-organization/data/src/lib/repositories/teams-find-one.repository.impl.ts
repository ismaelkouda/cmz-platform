import { Service, inject } from '@angular/core';
import {
    TeamsFindOneEntity,
    TeamsFindOneFilterValidateContract,
    TeamsFindOneRepository,
} from '@cmz/team-organization-domain';
import { FetchOptions } from '@cmz/shared-domain';
import { map, Observable } from 'rxjs';
import { teamsFindOneFilterMapper } from '../mappers/teams-find-one-filter.mapper';
import { TeamsFindOneMapper } from '../mappers/teams-find-one.mapper';
import { TeamsFindOneApi } from '../sources/teams-find-one.api';

@Service()
export class TeamsFindOneRepositoryImpl implements TeamsFindOneRepository {
    private readonly api = inject(TeamsFindOneApi);
    private readonly mapper = inject(TeamsFindOneMapper);

    execute(
        validContract: TeamsFindOneFilterValidateContract,
        options?: FetchOptions
    ): Observable<TeamsFindOneEntity> {
        const dto = teamsFindOneFilterMapper(validContract);
        return this.api
            .execute(dto, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
