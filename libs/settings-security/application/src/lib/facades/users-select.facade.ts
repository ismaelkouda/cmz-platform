import { Service, computed, inject } from '@angular/core';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { UsersSelectUseCase } from '../use-cases/users-select.use-case';
import { Observable } from 'rxjs';

interface UsersSelectParams {
    options?: FetchOptions;
}

@Service()
export class UsersSelectFacade extends ResourceFacade<
    SelectOption[],
    UsersSelectParams
> {
    private readonly useCase = inject(UsersSelectUseCase);

    readonly options = computed(() => this.value() ?? []);

    protected stream(params: UsersSelectParams): Observable<SelectOption[]> {
        return this.useCase.readAll(params.options);
    }

    load(options?: FetchOptions): void {
        this.setParams({ options });
    }
}
