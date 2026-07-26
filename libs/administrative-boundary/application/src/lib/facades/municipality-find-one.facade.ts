import { Service, inject } from '@angular/core';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions } from '@cmz/shared-domain';
import {
    MunicipalityFindOneEntity,
    MunicipalityFindOneFilterContract,
} from '@cmz/administrative-boundary-domain';
import { MunicipalityFindOneUseCase } from '../use-cases/municipality-find-one.use-case';
import { Observable } from 'rxjs';

interface MunicipalityFindOneParams {
    filter: MunicipalityFindOneFilterContract;
    options?: FetchOptions;
}

@Service()
export class MunicipalityFindOneFacade extends ResourceFacade<
    MunicipalityFindOneEntity,
    MunicipalityFindOneParams
> {
    private readonly useCase = inject(MunicipalityFindOneUseCase);

    protected stream(
        params: MunicipalityFindOneParams
    ): Observable<MunicipalityFindOneEntity> {
        return this.useCase.execute(params.filter, params.options);
    }

    read(
        filter: MunicipalityFindOneFilterContract,
        options?: FetchOptions
    ): void {
        this.setParams({ filter, options });
    }
}
