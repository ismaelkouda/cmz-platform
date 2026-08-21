import { Service, inject } from '@angular/core';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions } from '@cmz/shared-domain';
import {
    ParticipantsFindOneEntity,
    ParticipantsFindOneFilterContract,
} from '@cmz/team-organization-domain';
import { ParticipantsFindOneUseCase } from '../use-cases/participants-find-one.use-case';
import { Observable } from 'rxjs';

interface ParticipantsFindOneParams {
    filter: ParticipantsFindOneFilterContract;
    options?: FetchOptions;
}

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginFacade` (libs/authentication/application/src/lib/facades/login.facade.ts). */
@Service({ autoProvided: false })
export class ParticipantsFindOneFacade extends ResourceFacade<
    ParticipantsFindOneEntity,
    ParticipantsFindOneParams
> {
    private readonly useCase = inject(ParticipantsFindOneUseCase);

    protected stream(
        params: ParticipantsFindOneParams
    ): Observable<ParticipantsFindOneEntity> {
        return this.useCase.execute(params.filter, params.options);
    }

    read(
        filter: ParticipantsFindOneFilterContract,
        options?: FetchOptions
    ): void {
        this.setParams({ filter, options });
    }
}
