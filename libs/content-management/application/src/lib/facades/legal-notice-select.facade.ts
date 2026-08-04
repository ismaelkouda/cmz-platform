import { Service, computed, inject } from '@angular/core';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { LegalNoticeSelectUseCase } from '../use-cases/legal-notice-select.use-case';
import { Observable } from 'rxjs';

interface LegalNoticeSelectParams {
    options?: FetchOptions;
}

@Service()
export class LegalNoticeSelectFacade extends ResourceFacade<
    SelectOption[],
    LegalNoticeSelectParams
> {
    private readonly useCase = inject(LegalNoticeSelectUseCase);

    readonly options = computed(() => this.value() ?? []);

    protected stream(
        params: LegalNoticeSelectParams
    ): Observable<SelectOption[]> {
        return this.useCase.readAll(params.options);
    }

    load(options?: FetchOptions): void {
        this.setParams({ options });
    }
}
