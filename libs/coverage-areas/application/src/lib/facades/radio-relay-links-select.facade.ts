import { Service, computed, inject } from '@angular/core';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { RadioRelayLinksSelectUseCase } from '../use-cases/radio-relay-links-select.use-case';
import { Observable } from 'rxjs';

interface RadioRelayLinksSelectParams {
    options?: FetchOptions;
}

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginFacade` (libs/authentication/application/src/lib/facades/login.facade.ts). */
@Service({ autoProvided: false })
export class RadioRelayLinksSelectFacade extends ResourceFacade<
    SelectOption[],
    RadioRelayLinksSelectParams
> {
    private readonly useCase = inject(RadioRelayLinksSelectUseCase);

    readonly options = computed(() => this.value() ?? []);

    protected stream(
        params: RadioRelayLinksSelectParams
    ): Observable<SelectOption[]> {
        return this.useCase.readAll(params.options);
    }

    load(options?: FetchOptions): void {
        this.setParams({ options });
    }
}
