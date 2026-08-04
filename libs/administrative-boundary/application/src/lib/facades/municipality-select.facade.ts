import { Service, computed, inject } from '@angular/core';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions } from '@cmz/shared-domain';
import { MunicipalityOption } from '@cmz/administrative-boundary-domain';
import { MunicipalitySelectUseCase } from '../use-cases/municipality-select.use-case';
import { Observable } from 'rxjs';

interface MunicipalitySelectParams {
    options?: FetchOptions;
}

@Service()
export class MunicipalitySelectFacade extends ResourceFacade<
    MunicipalityOption[],
    MunicipalitySelectParams
> {
    private readonly useCase = inject(MunicipalitySelectUseCase);

    readonly options = computed(() => this.value() ?? []);

    protected stream(
        params: MunicipalitySelectParams
    ): Observable<MunicipalityOption[]> {
        return this.useCase.readAll(params.options);
    }

    load(options?: FetchOptions): void {
        this.setParams({ options });
    }
}
