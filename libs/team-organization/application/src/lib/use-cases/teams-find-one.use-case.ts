import { Service, inject } from '@angular/core';
import { FetchOptions } from '@cmz/shared-domain';
import {
    TeamsFindOneEntity,
    TeamsFindOneFilterContract,
    TeamsFindOneRepository,
    teamsFindOneFilterVo,
} from '@cmz/team-organization-domain';
import { Observable, defer } from 'rxjs';

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginUseCase` (libs/authentication/application/src/lib/use-cases/login.use-case.ts). */
@Service({ autoProvided: false })
export class TeamsFindOneUseCase {
    private readonly repository = inject(TeamsFindOneRepository);

    execute(
        contract: TeamsFindOneFilterContract,
        options?: FetchOptions
    ): Observable<TeamsFindOneEntity> {
        return defer(() =>
            this.repository.execute(teamsFindOneFilterVo(contract), options)
        );
    }
}
