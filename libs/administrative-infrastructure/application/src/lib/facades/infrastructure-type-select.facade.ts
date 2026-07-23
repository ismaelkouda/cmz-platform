import { Service, computed, inject } from '@angular/core';
import { BaseFacade } from '@cmz/shared-application';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { InfrastructureTypeSelectUseCase } from '../use-cases/infrastructure-type-select.use-case';

@Service()
export class InfrastructureTypeSelectFacade extends BaseFacade<
    SelectOption[],
    void
> {
    private readonly useCase = inject(InfrastructureTypeSelectUseCase);

    readonly options = computed(() => this.data() ?? []);

    load(options: FetchOptions = {}): void {
        this.fetch(null, this.useCase.readAll(options));
    }
}
