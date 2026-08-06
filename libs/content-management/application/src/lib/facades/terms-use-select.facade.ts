import { Service, computed, inject } from '@angular/core';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { TermsUseSelectUseCase } from '../use-cases/terms-use-select.use-case';
import { Observable } from 'rxjs';

interface TermsUseSelectParams {
    options?: FetchOptions;
}

@Service()
export class TermsUseSelectFacade extends ResourceFacade<
    SelectOption[],
    TermsUseSelectParams
> {
    private readonly useCase = inject(TermsUseSelectUseCase);

    readonly options = computed(() => this.value() ?? []);

    protected stream(params: TermsUseSelectParams): Observable<SelectOption[]> {
        return this.useCase.readAll(params.options);
    }

    load(options?: FetchOptions): void {
        this.setParams({ options });
    }
}
