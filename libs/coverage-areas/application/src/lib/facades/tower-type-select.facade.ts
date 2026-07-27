import { Service, computed, inject } from '@angular/core';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { TowerTypeSelectUseCase } from '../use-cases/tower-type-select.use-case';
import { Observable } from 'rxjs';

interface TowerTypeSelectParams {
    options?: FetchOptions;
}

@Service()
export class TowerTypeSelectFacade extends ResourceFacade<
    SelectOption[],
    TowerTypeSelectParams
> {
    private readonly useCase = inject(TowerTypeSelectUseCase);

    readonly options = computed(() => this.value() ?? []);

    protected stream(
        params: TowerTypeSelectParams
    ): Observable<SelectOption[]> {
        return this.useCase.readAll(params.options);
    }

    load(options?: FetchOptions): void {
        this.setParams({ options });
    }
}
