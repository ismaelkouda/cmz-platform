import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { PageQuery, PaginatedResourceFacade } from '@cmz/shared-application';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import {
    TasksRequestsEntity,
    TasksRequestsFilterContract,
} from '@cmz/requests-domain';
import { TasksRequestsUseCase } from '../use-cases/tasks-requests.use-case';

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginFacade` (libs/authentication/application/src/lib/facades/login.facade.ts). */
@Service({ autoProvided: false })
export class TasksRequestsFacade extends PaginatedResourceFacade<
    TasksRequestsEntity,
    TasksRequestsFilterContract
> {
    private readonly useCase = inject(TasksRequestsUseCase);

    protected stream(
        params: PageQuery<TasksRequestsFilterContract>
    ): Observable<PageResult<TasksRequestsEntity>> {
        return this.useCase.execute(
            params.filter ?? {},
            params.page,
            params.options
        );
    }

    export(
        filter: TasksRequestsFilterContract,
        options?: FetchOptions
    ): Observable<TasksRequestsEntity[]> {
        return this.useCase.export(filter, options);
    }
}
