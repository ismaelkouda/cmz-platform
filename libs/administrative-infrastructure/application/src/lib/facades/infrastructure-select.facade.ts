import { Service, computed, inject } from '@angular/core';
import { BaseFacade } from '@cmz/shared-application';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { InfrastructureSelectUseCase } from '../use-cases/infrastructure-select.use-case';

@Service()
export class InfrastructureSelectFacade extends BaseFacade<
    SelectOption[],
    void
> {
    private readonly useCase = inject(InfrastructureSelectUseCase);

    readonly options = computed(() => this.data() ?? []);

    load(options: FetchOptions = {}): void {
        this.fetch(null, this.useCase.readAll(options));
    }
}
