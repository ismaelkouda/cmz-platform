import { Service, computed, inject } from '@angular/core';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { FiberConstructorSelectUseCase } from '../use-cases/fiber-constructor-select.use-case';
import { Observable } from 'rxjs';

interface FiberConstructorSelectParams {
    options?: FetchOptions;
}

@Service()
export class FiberConstructorSelectFacade extends ResourceFacade<
    SelectOption[],
    FiberConstructorSelectParams
> {
    private readonly useCase = inject(FiberConstructorSelectUseCase);

    readonly options = computed(() => this.value() ?? []);

    protected stream(
        params: FiberConstructorSelectParams
    ): Observable<SelectOption[]> {
        return this.useCase.readAll(params.options);
    }

    load(options?: FetchOptions): void {
        this.setParams({ options });
    }
}
