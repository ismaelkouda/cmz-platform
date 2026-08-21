import { inject, Service } from '@angular/core';
import { FetchOptions } from '@cmz/shared-domain';
import { Observable, defer } from 'rxjs';
import {
    TasksActionsTypeProcessingEntity,
    TasksActionsTypeProcessingFilterContract,
    TasksActionsTypeProcessingRepository,
    tasksActionsTypeProcessingFilterVo,
} from '@cmz/processing-domain';

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginUseCase` (libs/authentication/application/src/lib/use-cases/login.use-case.ts). */
@Service({ autoProvided: false })
export class TasksActionsTypeProcessingUseCase {
    private readonly repository = inject(TasksActionsTypeProcessingRepository);

    readAll(
        contract: TasksActionsTypeProcessingFilterContract,
        options?: FetchOptions
    ): Observable<TasksActionsTypeProcessingEntity[]> {
        return defer(() =>
            this.repository.readAll(
                tasksActionsTypeProcessingFilterVo(contract),
                options
            )
        );
    }
}
