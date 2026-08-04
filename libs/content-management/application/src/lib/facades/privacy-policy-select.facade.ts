import { Service, computed, inject } from '@angular/core';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { PrivacyPolicySelectUseCase } from '../use-cases/privacy-policy-select.use-case';
import { Observable } from 'rxjs';

interface PrivacyPolicySelectParams {
    options?: FetchOptions;
}

@Service()
export class PrivacyPolicySelectFacade extends ResourceFacade<
    SelectOption[],
    PrivacyPolicySelectParams
> {
    private readonly useCase = inject(PrivacyPolicySelectUseCase);

    readonly options = computed(() => this.value() ?? []);

    protected stream(
        params: PrivacyPolicySelectParams
    ): Observable<SelectOption[]> {
        return this.useCase.readAll(params.options);
    }

    load(options?: FetchOptions): void {
        this.setParams({ options });
    }
}
