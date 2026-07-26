import { Service, inject } from '@angular/core';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions } from '@cmz/shared-domain';
import {
    RegionFindOneEntity,
    RegionFindOneFilterContract,
} from '@cmz/administrative-boundary-domain';
import { RegionFindOneUseCase } from '../use-cases/region-find-one.use-case';
import { Observable } from 'rxjs';

interface RegionFindOneParams {
    filter: RegionFindOneFilterContract;
    options?: FetchOptions;
}

@Service()
export class RegionFindOneFacade extends ResourceFacade<
    RegionFindOneEntity,
    RegionFindOneParams
> {
    private readonly useCase = inject(RegionFindOneUseCase);

    protected stream(
        params: RegionFindOneParams
    ): Observable<RegionFindOneEntity> {
        return this.useCase.execute(params.filter, params.options);
    }

    read(filter: RegionFindOneFilterContract, options?: FetchOptions): void {
        this.setParams({ filter, options });
    }
}
