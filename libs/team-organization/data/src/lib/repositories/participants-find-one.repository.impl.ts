import { Service, inject } from '@angular/core';
import {
    ParticipantsFindOneEntity,
    ParticipantsFindOneFilterValidateContract,
    ParticipantsFindOneRepository,
} from '@cmz/team-organization-domain';
import { FetchOptions } from '@cmz/shared-domain';
import { map, Observable } from 'rxjs';
import { participantsFindOneFilterMapper } from '../mappers/participants-find-one-filter.mapper';
import { ParticipantsFindOneMapper } from '../mappers/participants-find-one.mapper';
import { ParticipantsFindOneApi } from '../sources/participants-find-one.api';

@Service()
export class ParticipantsFindOneRepositoryImpl implements ParticipantsFindOneRepository {
    private readonly api = inject(ParticipantsFindOneApi);
    private readonly mapper = inject(ParticipantsFindOneMapper);

    execute(
        validContract: ParticipantsFindOneFilterValidateContract,
        options?: FetchOptions
    ): Observable<ParticipantsFindOneEntity> {
        const dto = participantsFindOneFilterMapper(validContract);
        return this.api
            .execute(dto, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
