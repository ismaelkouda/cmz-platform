import { Service, inject } from '@angular/core';
import { FetchOptions } from '@cmz/shared-domain';
import {
    TeamsPermissionOption,
    TeamsPermissionsRepository,
} from '@cmz/team-organization-domain';
import { Observable, defer } from 'rxjs';

@Service()
export class TeamsPermissionsUseCase {
    private readonly repository = inject(TeamsPermissionsRepository);

    readAll(options?: FetchOptions): Observable<TeamsPermissionOption[]> {
        return defer(() => this.repository.readAll(options));
    }
}
