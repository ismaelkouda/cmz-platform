import { Service, inject } from '@angular/core';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { ParticipantsSelectRepository } from '@cmz/team-organization-domain';
import { Observable, defer } from 'rxjs';

@Service()
export class ParticipantsSelectUseCase {
    private readonly repository = inject(ParticipantsSelectRepository);

    readAll(options?: FetchOptions): Observable<SelectOption[]> {
        return defer(() => this.repository.readAll(options));
    }
}
