import { Service, computed, inject } from '@angular/core';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions } from '@cmz/shared-domain';
import { PermissionTreeNode } from '@cmz/settings-security-domain';
import { ProfilesPermissionsPermissionsUseCase } from '../use-cases/profiles-permissions-permissions.use-case';
import { Observable } from 'rxjs';

interface ProfilesPermissionsPermissionsParams {
    options?: FetchOptions;
}

/**
 * Alimente le mode création du formulaire `profiles-permissions`
 * uniquement (le mode édition récupère les permissions cochées via
 * `ProfilesPermissionsFindOneFacade`) — même pattern que
 * `team-organization/TeamsPermissionsFacade`.
 */
@Service()
export class ProfilesPermissionsPermissionsFacade extends ResourceFacade<
    PermissionTreeNode[],
    ProfilesPermissionsPermissionsParams
> {
    private readonly useCase = inject(ProfilesPermissionsPermissionsUseCase);

    readonly permissions = computed(() => this.value() ?? []);

    protected stream(
        params: ProfilesPermissionsPermissionsParams
    ): Observable<PermissionTreeNode[]> {
        return this.useCase.readAll(params.options);
    }

    load(options?: FetchOptions): void {
        this.setParams({ options });
    }
}
