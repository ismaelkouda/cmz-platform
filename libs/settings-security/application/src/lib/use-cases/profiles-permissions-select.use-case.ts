import { Service, inject } from '@angular/core';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { ProfilesPermissionsSelectRepository } from '@cmz/settings-security-domain';
import { Observable, defer } from 'rxjs';

@Service()
export class ProfilesPermissionsSelectUseCase {
    private readonly repository = inject(ProfilesPermissionsSelectRepository);

    readAll(options?: FetchOptions): Observable<SelectOption[]> {
        return defer(() => this.repository.readAll(options));
    }
}
