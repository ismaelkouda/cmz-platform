import { Service, computed, inject } from '@angular/core';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { InfrastructureSelectUseCase } from '../use-cases/infrastructure-select.use-case';
import { Observable } from 'rxjs';

interface InfrastructureSelectParams {
    options?: FetchOptions;
}

@Service()
export class InfrastructureSelectFacade extends ResourceFacade<
    SelectOption[],
    InfrastructureSelectParams
> {
    private readonly useCase = inject(InfrastructureSelectUseCase);

    readonly options = computed(() => this.value() ?? []);

    protected stream(
        params: InfrastructureSelectParams
    ): Observable<SelectOption[]> {
        return this.useCase.readAll(params.options);
    }

    load(options?: FetchOptions): void {
        this.setParams({ options });
    }
}
