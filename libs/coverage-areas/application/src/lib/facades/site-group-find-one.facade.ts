import { Service, inject } from '@angular/core';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions } from '@cmz/shared-domain';
import {
    SiteGroupFindOneEntity,
    SiteGroupFindOneFilterContract,
} from '@cmz/coverage-areas-domain';
import { SiteGroupFindOneUseCase } from '../use-cases/site-group-find-one.use-case';
import { Observable } from 'rxjs';

interface SiteGroupFindOneParams {
    filter: SiteGroupFindOneFilterContract;
    options?: FetchOptions;
}

@Service()
export class SiteGroupFindOneFacade extends ResourceFacade<
    SiteGroupFindOneEntity,
    SiteGroupFindOneParams
> {
    private readonly useCase = inject(SiteGroupFindOneUseCase);

    protected stream(
        params: SiteGroupFindOneParams
    ): Observable<SiteGroupFindOneEntity> {
        return this.useCase.execute(params.filter, params.options);
    }

    read(filter: SiteGroupFindOneFilterContract, options?: FetchOptions): void {
        this.setParams({ filter, options });
    }
}
