import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { FetchOptions } from '@cmz/shared-domain';
import { PageQuery, PaginatedResourceFacade } from '@cmz/shared-application';
import { PageResult } from '@cmz/shared-domain';
import {
    QueuesProcessingEntity,
    QueuesProcessingFilterContract,
} from '@cmz/processing-domain';
import { QueuesProcessingUseCase } from '../use-cases/queues-processing.use-case';

@Service()
export class QueuesProcessingFacade extends PaginatedResourceFacade<
    QueuesProcessingEntity,
    QueuesProcessingFilterContract
> {
    private readonly useCase = inject(QueuesProcessingUseCase);

    protected stream(
        params: PageQuery<QueuesProcessingFilterContract>
    ): Observable<PageResult<QueuesProcessingEntity>> {
        return this.useCase.execute(
            params.filter ?? {},
            params.page,
            params.options
        );
    }

    export(
        filter: QueuesProcessingFilterContract,
        options?: FetchOptions
    ): Observable<QueuesProcessingEntity[]> {
        return this.useCase.export(filter, options);
    }
}
