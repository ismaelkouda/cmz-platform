import { Service, inject } from '@angular/core';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { TeamsSelectRepository } from '@cmz/team-organization-domain';
import { Observable, defer } from 'rxjs';

@Service()
export class TeamsSelectUseCase {
    private readonly repository = inject(TeamsSelectRepository);

    readAll(options?: FetchOptions): Observable<SelectOption[]> {
        return defer(() => this.repository.readAll(options));
    }
}
