import { Service, inject } from '@angular/core';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions } from '@cmz/shared-domain';
import {
    ProfilesPermissionsFindOneEntity,
    ProfilesPermissionsFindOneFilterContract,
} from '@cmz/settings-security-domain';
import { ProfilesPermissionsFindOneUseCase } from '../use-cases/profiles-permissions-find-one.use-case';
import { Observable } from 'rxjs';

interface ProfilesPermissionsFindOneParams {
    filter: ProfilesPermissionsFindOneFilterContract;
    options?: FetchOptions;
}

@Service()
export class ProfilesPermissionsFindOneFacade extends ResourceFacade<
    ProfilesPermissionsFindOneEntity,
    ProfilesPermissionsFindOneParams
> {
    private readonly useCase = inject(ProfilesPermissionsFindOneUseCase);

    protected stream(
        params: ProfilesPermissionsFindOneParams
    ): Observable<ProfilesPermissionsFindOneEntity> {
        return this.useCase.execute(params.filter, params.options);
    }

    read(
        filter: ProfilesPermissionsFindOneFilterContract,
        options?: FetchOptions
    ): void {
        this.setParams({ filter, options });
    }
}
