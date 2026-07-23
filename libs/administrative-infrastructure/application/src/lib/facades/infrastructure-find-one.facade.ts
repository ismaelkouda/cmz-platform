import { Service, inject } from '@angular/core';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions } from '@cmz/shared-domain';
import {
    InfrastructureFindOneEntity,
    InfrastructureFindOneFilterContract,
} from '@cmz/administrative-infrastructure-domain';
import { InfrastructureFindOneUseCase } from '../use-cases/infrastructure-find-one.use-case';
import { Observable } from 'rxjs';

interface InfrastructureFindOneParams {
    filter: InfrastructureFindOneFilterContract;
    options?: FetchOptions;
}

@Service()
export class InfrastructureFindOneFacade extends ResourceFacade<
    InfrastructureFindOneEntity,
    InfrastructureFindOneParams
> {
    private readonly useCase = inject(InfrastructureFindOneUseCase);

    protected stream(
        params: InfrastructureFindOneParams
    ): Observable<InfrastructureFindOneEntity> {
        return this.useCase.execute(params.filter, params.options);
    }

    read(
        filter: InfrastructureFindOneFilterContract,
        options?: FetchOptions
    ): void {
        this.setParams({ filter, options });
    }
}
