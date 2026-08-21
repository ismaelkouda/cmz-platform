import { Service, computed, inject } from '@angular/core';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { TeamsSelectUseCase } from '../use-cases/teams-select.use-case';
import { Observable } from 'rxjs';

interface TeamsSelectParams {
    options?: FetchOptions;
}

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginFacade` (libs/authentication/application/src/lib/facades/login.facade.ts). */
@Service({ autoProvided: false })
export class TeamsSelectFacade extends ResourceFacade<
    SelectOption[],
    TeamsSelectParams
> {
    private readonly useCase = inject(TeamsSelectUseCase);

    readonly options = computed(() => this.value() ?? []);

    protected stream(params: TeamsSelectParams): Observable<SelectOption[]> {
        return this.useCase.readAll(params.options);
    }

    load(options?: FetchOptions): void {
        this.setParams({ options });
    }
}
