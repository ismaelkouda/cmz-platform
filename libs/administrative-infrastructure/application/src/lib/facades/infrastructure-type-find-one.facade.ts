import { Service, inject } from '@angular/core';
import { BaseFacade } from '@cmz/shared-application';
import { FetchOptions } from '@cmz/shared-domain';
import {
    InfrastructureTypeFindOneEntity,
    InfrastructureTypeFindOneFilterContract,
} from '@cmz/administrative-infrastructure-domain';
import { InfrastructureTypeFindOneUseCase } from '../use-cases/infrastructure-type-find-one.use-case';

@Service()
export class InfrastructureTypeFindOneFacade extends BaseFacade<
    InfrastructureTypeFindOneEntity,
    InfrastructureTypeFindOneFilterContract
> {
    private readonly useCase = inject(InfrastructureTypeFindOneUseCase);

    read(
        filter: InfrastructureTypeFindOneFilterContract,
        options: FetchOptions = {}
    ): void {
        this.fetch(filter, this.useCase.execute(filter, options));
    }
}
