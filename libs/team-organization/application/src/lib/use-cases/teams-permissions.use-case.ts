import { Service, inject } from '@angular/core';
import { FetchOptions } from '@cmz/shared-domain';
import {
    TeamsPermissionOption,
    TeamsPermissionsRepository,
} from '@cmz/team-organization-domain';
import { Observable, defer } from 'rxjs';

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginUseCase` (libs/authentication/application/src/lib/use-cases/login.use-case.ts). */
@Service({ autoProvided: false })
export class TeamsPermissionsUseCase {
    private readonly repository = inject(TeamsPermissionsRepository);

    readAll(options?: FetchOptions): Observable<TeamsPermissionOption[]> {
        return defer(() => this.repository.readAll(options));
    }
}
