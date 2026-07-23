import { Service, inject } from '@angular/core';
import { BaseFacade } from '@cmz/shared-application';
import { FetchOptions } from '@cmz/shared-domain';
import {
    InfrastructureFindOneEntity,
    InfrastructureFindOneFilterContract,
} from '@cmz/administrative-infrastructure-domain';
import { InfrastructureFindOneUseCase } from '../use-cases/infrastructure-find-one.use-case';

@Service()
export class InfrastructureFindOneFacade extends BaseFacade<
    InfrastructureFindOneEntity,
    InfrastructureFindOneFilterContract
> {
    private readonly useCase = inject(InfrastructureFindOneUseCase);

    read(
        filter: InfrastructureFindOneFilterContract,
        options: FetchOptions = {}
    ): void {
        this.fetch(filter, this.useCase.execute(filter, options));
    }
}
