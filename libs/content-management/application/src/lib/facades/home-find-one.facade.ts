import { Service, inject } from '@angular/core';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions } from '@cmz/shared-domain';
import {
    HomeFindOneEntity,
    HomeFindOneFilterContract,
} from '@cmz/content-management-domain';
import { HomeFindOneUseCase } from '../use-cases/home-find-one.use-case';
import { Observable } from 'rxjs';

interface HomeFindOneParams {
    filter: HomeFindOneFilterContract;
    options?: FetchOptions;
}

@Service()
export class HomeFindOneFacade extends ResourceFacade<
    HomeFindOneEntity,
    HomeFindOneParams
> {
    private readonly useCase = inject(HomeFindOneUseCase);

    protected stream(params: HomeFindOneParams): Observable<HomeFindOneEntity> {
        return this.useCase.execute(params.filter, params.options);
    }

    read(filter: HomeFindOneFilterContract, options?: FetchOptions): void {
        this.setParams({ filter, options });
    }
}
