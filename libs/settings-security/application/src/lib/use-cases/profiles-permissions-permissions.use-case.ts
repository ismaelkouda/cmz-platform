import { Service, inject } from '@angular/core';
import { FetchOptions } from '@cmz/shared-domain';
import {
    PermissionTreeNode,
    ProfilesPermissionsPermissionsRepository,
} from '@cmz/settings-security-domain';
import { Observable, defer } from 'rxjs';

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginUseCase` (libs/authentication/application/src/lib/use-cases/login.use-case.ts). */
@Service({ autoProvided: false })
export class ProfilesPermissionsPermissionsUseCase {
    private readonly repository = inject(
        ProfilesPermissionsPermissionsRepository
    );

    readAll(options?: FetchOptions): Observable<PermissionTreeNode[]> {
        return defer(() => this.repository.readAll(options));
    }
}
