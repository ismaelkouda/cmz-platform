import { Service, computed, inject } from '@angular/core';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { SiteGroupSelectUseCase } from '../use-cases/site-group-select.use-case';
import { Observable } from 'rxjs';

interface SiteGroupSelectParams {
    options?: FetchOptions;
}

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginFacade` (libs/authentication/application/src/lib/facades/login.facade.ts). */
@Service({ autoProvided: false })
export class SiteGroupSelectFacade extends ResourceFacade<
    SelectOption[],
    SiteGroupSelectParams
> {
    private readonly useCase = inject(SiteGroupSelectUseCase);

    readonly options = computed(() => this.value() ?? []);

    protected stream(
        params: SiteGroupSelectParams
    ): Observable<SelectOption[]> {
        return this.useCase.readAll(params.options);
    }

    load(options?: FetchOptions): void {
        this.setParams({ options });
    }
}
