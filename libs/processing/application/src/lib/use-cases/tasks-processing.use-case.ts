import { inject, Service } from '@angular/core';
import { defer, Observable } from 'rxjs';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import {
    TasksProcessingEntity,
    TasksProcessingFilterContract,
    TasksProcessingRepository,
    tasksProcessingFilterEntity,
    tasksProcessingFilterVo,
} from '@cmz/processing-domain';

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginUseCase` (libs/authentication/application/src/lib/use-cases/login.use-case.ts). */
@Service({ autoProvided: false })
export class TasksProcessingUseCase {
    private readonly repository = inject(TasksProcessingRepository);

    execute(
        contract: TasksProcessingFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<TasksProcessingEntity>> {
        return defer(() =>
            this.repository.execute(
                tasksProcessingFilterEntity(tasksProcessingFilterVo(contract)),
                page,
                options
            )
        );
    }

    export(
        contract: TasksProcessingFilterContract,
        options?: FetchOptions
    ): Observable<TasksProcessingEntity[]> {
        return defer(() =>
            this.repository.export(
                tasksProcessingFilterEntity(tasksProcessingFilterVo(contract)),
                options
            )
        );
    }
}
