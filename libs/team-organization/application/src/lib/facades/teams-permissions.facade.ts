import { Service, computed, inject } from '@angular/core';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions } from '@cmz/shared-domain';
import { TeamsPermissionOption } from '@cmz/team-organization-domain';
import { TeamsPermissionsUseCase } from '../use-cases/teams-permissions.use-case';
import { Observable } from 'rxjs';

interface TeamsPermissionsParams {
    options?: FetchOptions;
}

/**
 * Alimente le mode création du formulaire `teams` uniquement (le mode
 * édition récupère les permissions cochées via `TeamsFindOneFacade` —
 * cf. décision domaine `TeamsPermissionsRepository`).
 */
@Service()
export class TeamsPermissionsFacade extends ResourceFacade<
    TeamsPermissionOption[],
    TeamsPermissionsParams
> {
    private readonly useCase = inject(TeamsPermissionsUseCase);

    readonly permissions = computed(() => this.value() ?? []);

    protected stream(
        params: TeamsPermissionsParams
    ): Observable<TeamsPermissionOption[]> {
        return this.useCase.readAll(params.options);
    }

    load(options?: FetchOptions): void {
        this.setParams({ options });
    }
}
