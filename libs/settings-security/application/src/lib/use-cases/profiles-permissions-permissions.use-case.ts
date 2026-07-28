import { Service, inject } from '@angular/core';
import { FetchOptions } from '@cmz/shared-domain';
import {
    PermissionTreeNode,
    ProfilesPermissionsPermissionsRepository,
} from '@cmz/settings-security-domain';
import { Observable, defer } from 'rxjs';

@Service()
export class ProfilesPermissionsPermissionsUseCase {
    private readonly repository = inject(
        ProfilesPermissionsPermissionsRepository
    );

    readAll(options?: FetchOptions): Observable<PermissionTreeNode[]> {
        return defer(() => this.repository.readAll(options));
    }
}
