import { Service, inject } from '@angular/core';
import { FetchOptions } from '@cmz/shared-domain';
import {
    ProfilesPermissionsFindOneEntity,
    ProfilesPermissionsFindOneFilterContract,
    ProfilesPermissionsFindOneRepository,
    profilesPermissionsFindOneFilterVo,
} from '@cmz/settings-security-domain';
import { Observable, defer } from 'rxjs';

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginUseCase` (libs/authentication/application/src/lib/use-cases/login.use-case.ts). */
@Service({ autoProvided: false })
export class ProfilesPermissionsFindOneUseCase {
    private readonly repository = inject(ProfilesPermissionsFindOneRepository);

    execute(
        contract: ProfilesPermissionsFindOneFilterContract,
        options?: FetchOptions
    ): Observable<ProfilesPermissionsFindOneEntity> {
        return defer(() =>
            this.repository.execute(
                profilesPermissionsFindOneFilterVo(contract),
                options
            )
        );
    }
}
