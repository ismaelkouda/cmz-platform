import { Service, computed, inject } from '@angular/core';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions } from '@cmz/shared-domain';
import { DepartmentOption } from '@cmz/administrative-boundary-domain';
import { DepartmentSelectUseCase } from '../use-cases/department-select.use-case';
import { Observable } from 'rxjs';

interface DepartmentSelectParams {
    options?: FetchOptions;
}

@Service()
export class DepartmentSelectFacade extends ResourceFacade<
    DepartmentOption[],
    DepartmentSelectParams
> {
    private readonly useCase = inject(DepartmentSelectUseCase);

    readonly options = computed(() => this.value() ?? []);

    protected stream(
        params: DepartmentSelectParams
    ): Observable<DepartmentOption[]> {
        return this.useCase.readAll(params.options);
    }

    load(options?: FetchOptions): void {
        this.setParams({ options });
    }
}
