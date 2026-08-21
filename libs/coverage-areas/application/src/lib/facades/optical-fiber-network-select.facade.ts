import { Service, computed, inject } from '@angular/core';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { OpticalFiberNetworkSelectUseCase } from '../use-cases/optical-fiber-network-select.use-case';
import { Observable } from 'rxjs';

interface OpticalFiberNetworkSelectParams {
    options?: FetchOptions;
}

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginFacade` (libs/authentication/application/src/lib/facades/login.facade.ts). */
@Service({ autoProvided: false })
export class OpticalFiberNetworkSelectFacade extends ResourceFacade<
    SelectOption[],
    OpticalFiberNetworkSelectParams
> {
    private readonly useCase = inject(OpticalFiberNetworkSelectUseCase);

    readonly options = computed(() => this.value() ?? []);

    protected stream(
        params: OpticalFiberNetworkSelectParams
    ): Observable<SelectOption[]> {
        return this.useCase.readAll(params.options);
    }

    load(options?: FetchOptions): void {
        this.setParams({ options });
    }
}
