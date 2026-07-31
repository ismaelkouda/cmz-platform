import { inject, Service } from '@angular/core';
import { defer, Observable } from 'rxjs';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import {
    TasksRequestsEntity,
    TasksRequestsFilterContract,
    TasksRequestsRepository,
    tasksRequestsFilterEntity,
    tasksRequestsFilterVo,
} from '@cmz/requests-domain';

@Service()
export class TasksRequestsUseCase {
    private readonly repository = inject(TasksRequestsRepository);

    execute(
        contract: TasksRequestsFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<TasksRequestsEntity>> {
        return defer(() =>
            this.repository.execute(
                tasksRequestsFilterEntity(tasksRequestsFilterVo(contract)),
                page,
                options
            )
        );
    }

    export(
        contract: TasksRequestsFilterContract,
        options?: FetchOptions
    ): Observable<TasksRequestsEntity[]> {
        return defer(() =>
            this.repository.export(
                tasksRequestsFilterEntity(tasksRequestsFilterVo(contract)),
                options
            )
        );
    }
}
