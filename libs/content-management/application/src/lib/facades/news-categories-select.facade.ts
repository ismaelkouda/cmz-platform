import { Service, computed, inject } from '@angular/core';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions } from '@cmz/shared-domain';
import { NewsCategoryOption } from '@cmz/content-management-domain';
import { NewsCategoriesSelectUseCase } from '../use-cases/news-categories-select.use-case';
import { Observable } from 'rxjs';

interface NewsCategoriesSelectParams {
    options?: FetchOptions;
}

@Service()
export class NewsCategoriesSelectFacade extends ResourceFacade<
    NewsCategoryOption[],
    NewsCategoriesSelectParams
> {
    private readonly useCase = inject(NewsCategoriesSelectUseCase);

    readonly categories = computed(() => this.value() ?? []);

    protected stream(
        params: NewsCategoriesSelectParams
    ): Observable<NewsCategoryOption[]> {
        return this.useCase.execute(params.options);
    }

    load(options?: FetchOptions): void {
        this.setParams({ options });
    }
}
