import { Service, computed, inject } from '@angular/core';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { InfrastructureTypeSelectUseCase } from '../use-cases/infrastructure-type-select.use-case';
import { Observable } from 'rxjs';

interface InfrastructureTypeSelectParams {
    options?: FetchOptions;
}

@Service()
export class InfrastructureTypeSelectFacade extends ResourceFacade<
    SelectOption[],
    InfrastructureTypeSelectParams
> {
    private readonly useCase = inject(InfrastructureTypeSelectUseCase);

    readonly options = computed(() => this.value() ?? []);

    protected stream(
        params: InfrastructureTypeSelectParams
    ): Observable<SelectOption[]> {
        return this.useCase.readAll(params.options);
    }

    load(options?: FetchOptions): void {
        this.setParams({ options });
    }
}
