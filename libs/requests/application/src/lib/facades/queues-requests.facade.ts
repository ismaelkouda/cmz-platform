import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { FetchOptions } from '@cmz/shared-domain';
import { PageQuery, PaginatedResourceFacade } from '@cmz/shared-application';
import { PageResult } from '@cmz/shared-domain';
import {
    QueuesRequestsEntity,
    QueuesRequestsFilterContract,
} from '@cmz/requests-domain';
import { QueuesRequestsUseCase } from '../use-cases/queues-requests.use-case';

@Service()
export class QueuesRequestsFacade extends PaginatedResourceFacade<
    QueuesRequestsEntity,
    QueuesRequestsFilterContract
> {
    private readonly useCase = inject(QueuesRequestsUseCase);

    protected stream(
        params: PageQuery<QueuesRequestsFilterContract>
    ): Observable<PageResult<QueuesRequestsEntity>> {
        return this.useCase.execute(
            params.filter ?? {},
            params.page,
            params.options
        );
    }

    /** Export métier — dataset complet filtré (hors pagination UI). */
    export(
        filter: QueuesRequestsFilterContract,
        options?: FetchOptions
    ): Observable<QueuesRequestsEntity[]> {
        return this.useCase.export(filter, options);
    }
}
