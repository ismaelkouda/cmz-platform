import { Service, inject } from '@angular/core';
import { FetchOptions } from '@cmz/shared-domain';
import {
    ParticipantsFindOneEntity,
    ParticipantsFindOneFilterContract,
    ParticipantsFindOneRepository,
    participantsFindOneFilterVo,
} from '@cmz/team-organization-domain';
import { Observable, defer } from 'rxjs';

@Service()
export class ParticipantsFindOneUseCase {
    private readonly repository = inject(ParticipantsFindOneRepository);

    execute(
        contract: ParticipantsFindOneFilterContract,
        options?: FetchOptions
    ): Observable<ParticipantsFindOneEntity> {
        return defer(() =>
            this.repository.execute(
                participantsFindOneFilterVo(contract),
                options
            )
        );
    }
}
