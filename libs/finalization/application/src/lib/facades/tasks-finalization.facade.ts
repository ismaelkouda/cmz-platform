import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { PageQuery, PaginatedResourceFacade } from '@cmz/shared-application';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import {
    TasksFinalizationEntity,
    TasksFinalizationFilterContract,
} from '@cmz/finalization-domain';
import { TasksFinalizationUseCase } from '../use-cases/tasks-finalization.use-case';

@Service()
export class TasksFinalizationFacade extends PaginatedResourceFacade<
    TasksFinalizationEntity,
    TasksFinalizationFilterContract
> {
    private readonly useCase = inject(TasksFinalizationUseCase);

    protected stream(
        params: PageQuery<TasksFinalizationFilterContract>
    ): Observable<PageResult<TasksFinalizationEntity>> {
        return this.useCase.execute(
            params.filter ?? {},
            params.page,
            params.options
        );
    }

    export(
        filter: TasksFinalizationFilterContract,
        options?: FetchOptions
    ): Observable<TasksFinalizationEntity[]> {
        return this.useCase.export(filter, options);
    }
}
