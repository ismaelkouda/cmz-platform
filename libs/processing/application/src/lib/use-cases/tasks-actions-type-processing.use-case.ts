import { inject, Service } from '@angular/core';
import { FetchOptions } from '@cmz/shared-domain';
import { Observable, defer } from 'rxjs';
import {
    TasksActionsTypeProcessingEntity,
    TasksActionsTypeProcessingFilterContract,
    TasksActionsTypeProcessingRepository,
    tasksActionsTypeProcessingFilterVo,
} from '@cmz/processing-domain';

@Service()
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
