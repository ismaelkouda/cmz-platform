import { Service, inject } from '@angular/core';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions } from '@cmz/shared-domain';
import {
    NewsFindOneEntity,
    NewsFindOneFilterContract,
} from '@cmz/content-management-domain';
import { NewsFindOneUseCase } from '../use-cases/news-find-one.use-case';
import { Observable } from 'rxjs';

interface NewsFindOneParams {
    filter: NewsFindOneFilterContract;
    options?: FetchOptions;
}

@Service()
export class NewsFindOneFacade extends ResourceFacade<
    NewsFindOneEntity,
    NewsFindOneParams
> {
    private readonly useCase = inject(NewsFindOneUseCase);

    protected stream(params: NewsFindOneParams): Observable<NewsFindOneEntity> {
        return this.useCase.execute(params.filter, params.options);
    }

    read(filter: NewsFindOneFilterContract, options?: FetchOptions): void {
        this.setParams({ filter, options });
    }
}
