import { Service, computed, inject } from '@angular/core';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { MobileNetworkSelectUseCase } from '../use-cases/mobile-network-select.use-case';
import { Observable } from 'rxjs';

interface MobileNetworkSelectParams {
    options?: FetchOptions;
}

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginFacade` (libs/authentication/application/src/lib/facades/login.facade.ts). */
@Service({ autoProvided: false })
export class MobileNetworkSelectFacade extends ResourceFacade<
    SelectOption[],
    MobileNetworkSelectParams
> {
    private readonly useCase = inject(MobileNetworkSelectUseCase);

    readonly options = computed(() => this.value() ?? []);

    protected stream(
        params: MobileNetworkSelectParams
    ): Observable<SelectOption[]> {
        return this.useCase.readAll(params.options);
    }

    load(options?: FetchOptions): void {
        this.setParams({ options });
    }
}
