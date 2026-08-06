import { Service, computed, inject } from '@angular/core';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { HomeSelectUseCase } from '../use-cases/home-select.use-case';
import { Observable } from 'rxjs';

interface HomeSelectParams {
    options?: FetchOptions;
}

@Service()
export class HomeSelectFacade extends ResourceFacade<
    SelectOption[],
    HomeSelectParams
> {
    private readonly useCase = inject(HomeSelectUseCase);

    readonly options = computed(() => this.value() ?? []);

    protected stream(params: HomeSelectParams): Observable<SelectOption[]> {
        return this.useCase.readAll(params.options);
    }

    load(options?: FetchOptions): void {
        this.setParams({ options });
    }
}
