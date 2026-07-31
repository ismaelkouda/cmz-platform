import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { FetchOptions } from '@cmz/shared-domain';
import { PageQuery, PaginatedResourceFacade } from '@cmz/shared-application';
import { PageResult } from '@cmz/shared-domain';
import {
    TasksProcessingEntity,
    TasksProcessingFilterContract,
} from '@cmz/processing-domain';
import { TasksProcessingUseCase } from '../use-cases/tasks-processing.use-case';

@Service()
export class TasksProcessingFacade extends PaginatedResourceFacade<
    TasksProcessingEntity,
    TasksProcessingFilterContract
> {
    private readonly useCase = inject(TasksProcessingUseCase);

    protected stream(
        params: PageQuery<TasksProcessingFilterContract>
    ): Observable<PageResult<TasksProcessingEntity>> {
        return this.useCase.execute(
            params.filter ?? {},
            params.page,
            params.options
        );
    }

    export(
        filter: TasksProcessingFilterContract,
        options?: FetchOptions
    ): Observable<TasksProcessingEntity[]> {
        return this.useCase.export(filter, options);
    }
}
