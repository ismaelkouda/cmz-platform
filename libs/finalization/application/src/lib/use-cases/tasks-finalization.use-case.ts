import { inject, Service } from '@angular/core';
import { defer, Observable } from 'rxjs';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import {
    TasksFinalizationEntity,
    TasksFinalizationFilterContract,
    TasksFinalizationRepository,
    tasksFinalizationFilterEntity,
    tasksFinalizationFilterVo,
} from '@cmz/finalization-domain';

@Service()
export class TasksFinalizationUseCase {
    private readonly repository = inject(TasksFinalizationRepository);

    execute(
        contract: TasksFinalizationFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<TasksFinalizationEntity>> {
        return defer(() =>
            this.repository.execute(
                tasksFinalizationFilterEntity(
                    tasksFinalizationFilterVo(contract)
                ),
                page,
                options
            )
        );
    }

    export(
        contract: TasksFinalizationFilterContract,
        options?: FetchOptions
    ): Observable<TasksFinalizationEntity[]> {
        return defer(() =>
            this.repository.export(
                tasksFinalizationFilterEntity(
                    tasksFinalizationFilterVo(contract)
                ),
                options
            )
        );
    }
}
