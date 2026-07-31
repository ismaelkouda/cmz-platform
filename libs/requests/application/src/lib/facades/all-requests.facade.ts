import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { PageQuery, PaginatedResourceFacade } from '@cmz/shared-application';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import {
    AllRequestsFilterContract,
    AllRequestsEntity,
} from '@cmz/requests-domain';
import { AllRequestsUseCase } from '../use-cases/all-requests.use-case';

@Service()
export class AllRequestsFacade extends PaginatedResourceFacade<
    AllRequestsEntity,
    AllRequestsFilterContract
> {
    private readonly useCase = inject(AllRequestsUseCase);

    protected stream(
        params: PageQuery<AllRequestsFilterContract>
    ): Observable<PageResult<AllRequestsEntity>> {
        return this.useCase.execute(
            params.filter ?? {},
            params.page,
            params.options
        );
    }

    export(
        filter: AllRequestsFilterContract,
        options?: FetchOptions
    ): Observable<AllRequestsEntity[]> {
        return this.useCase.export(filter, options);
    }
}
