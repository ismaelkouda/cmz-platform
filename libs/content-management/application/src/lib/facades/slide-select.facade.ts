import { Service, computed, inject } from '@angular/core';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { SlideSelectUseCase } from '../use-cases/slide-select.use-case';
import { Observable } from 'rxjs';

interface SlideSelectParams {
    options?: FetchOptions;
}

@Service()
export class SlideSelectFacade extends ResourceFacade<
    SelectOption[],
    SlideSelectParams
> {
    private readonly useCase = inject(SlideSelectUseCase);

    readonly options = computed(() => this.value() ?? []);

    protected stream(params: SlideSelectParams): Observable<SelectOption[]> {
        return this.useCase.readAll(params.options);
    }

    load(options?: FetchOptions): void {
        this.setParams({ options });
    }
}
