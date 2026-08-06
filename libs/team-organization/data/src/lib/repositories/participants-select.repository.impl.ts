import { Service, inject } from '@angular/core';
import { ParticipantsSelectRepository } from '@cmz/team-organization-domain';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { map, Observable } from 'rxjs';
import { ParticipantsSelectMapper } from '../mappers/participants-select.mapper';
import { ParticipantsSelectApi } from '../sources/participants-select.api';

@Service()
export class ParticipantsSelectRepositoryImpl implements ParticipantsSelectRepository {
    private readonly api = inject(ParticipantsSelectApi);
    private readonly mapper = inject(ParticipantsSelectMapper);

    readAll(options?: FetchOptions): Observable<SelectOption[]> {
        return this.api
            .readAll(options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
