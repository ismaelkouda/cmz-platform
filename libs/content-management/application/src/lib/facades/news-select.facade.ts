import { Service, computed, inject } from '@angular/core';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { NewsSelectUseCase } from '../use-cases/news-select.use-case';
import { Observable } from 'rxjs';

interface NewsSelectParams {
    options?: FetchOptions;
}

@Service()
export class NewsSelectFacade extends ResourceFacade<
    SelectOption[],
    NewsSelectParams
> {
    private readonly useCase = inject(NewsSelectUseCase);

    readonly options = computed(() => this.value() ?? []);

    protected stream(params: NewsSelectParams): Observable<SelectOption[]> {
        return this.useCase.readAll(params.options);
    }

    load(options?: FetchOptions): void {
        this.setParams({ options });
    }
}
