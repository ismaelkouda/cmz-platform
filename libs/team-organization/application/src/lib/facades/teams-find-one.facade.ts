import { Service, inject } from '@angular/core';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions } from '@cmz/shared-domain';
import {
    TeamsFindOneEntity,
    TeamsFindOneFilterContract,
} from '@cmz/team-organization-domain';
import { TeamsFindOneUseCase } from '../use-cases/teams-find-one.use-case';
import { Observable } from 'rxjs';

interface TeamsFindOneParams {
    filter: TeamsFindOneFilterContract;
    options?: FetchOptions;
}

@Service()
export class TeamsFindOneFacade extends ResourceFacade<
    TeamsFindOneEntity,
    TeamsFindOneParams
> {
    private readonly useCase = inject(TeamsFindOneUseCase);

    protected stream(
        params: TeamsFindOneParams
    ): Observable<TeamsFindOneEntity> {
        return this.useCase.execute(params.filter, params.options);
    }

    read(filter: TeamsFindOneFilterContract, options?: FetchOptions): void {
        this.setParams({ filter, options });
    }
}
