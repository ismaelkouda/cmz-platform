import { Service, computed, inject } from '@angular/core';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { ProfilesPermissionsSelectUseCase } from '../use-cases/profiles-permissions-select.use-case';
import { Observable } from 'rxjs';

interface ProfilesPermissionsSelectParams {
    options?: FetchOptions;
}

@Service()
export class ProfilesPermissionsSelectFacade extends ResourceFacade<
    SelectOption[],
    ProfilesPermissionsSelectParams
> {
    private readonly useCase = inject(ProfilesPermissionsSelectUseCase);

    readonly options = computed(() => this.value() ?? []);

    protected stream(
        params: ProfilesPermissionsSelectParams
    ): Observable<SelectOption[]> {
        return this.useCase.readAll(params.options);
    }

    load(options?: FetchOptions): void {
        this.setParams({ options });
    }
}
