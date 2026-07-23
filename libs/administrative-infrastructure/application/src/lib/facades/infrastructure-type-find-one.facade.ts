import { Service, inject } from '@angular/core';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions } from '@cmz/shared-domain';
import {
    InfrastructureTypeFindOneEntity,
    InfrastructureTypeFindOneFilterContract,
} from '@cmz/administrative-infrastructure-domain';
import { InfrastructureTypeFindOneUseCase } from '../use-cases/infrastructure-type-find-one.use-case';
import { Observable } from 'rxjs';

interface InfrastructureTypeFindOneParams {
    filter: InfrastructureTypeFindOneFilterContract;
    options?: FetchOptions;
}

@Service()
export class InfrastructureTypeFindOneFacade extends ResourceFacade<
    InfrastructureTypeFindOneEntity,
    InfrastructureTypeFindOneParams
> {
    private readonly useCase = inject(InfrastructureTypeFindOneUseCase);

    protected stream(
        params: InfrastructureTypeFindOneParams
    ): Observable<InfrastructureTypeFindOneEntity> {
        return this.useCase.execute(params.filter, params.options);
    }

    read(
        filter: InfrastructureTypeFindOneFilterContract,
        options?: FetchOptions
    ): void {
        this.setParams({ filter, options });
    }
}
