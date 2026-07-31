import { inject, Service } from '@angular/core';
import { FetchOptions } from '@cmz/shared-domain';
import { Observable, defer } from 'rxjs';
import {
    TasksActionsTypeEntity,
    TasksActionsTypeFilterContract,
    TasksActionsTypeRepository,
    tasksActionsTypeFilterVo,
} from '@cmz/processing-domain';

@Service()
export class TasksActionsTypeUseCase {
    private readonly repository = inject(TasksActionsTypeRepository);

    readAll(
        contract: TasksActionsTypeFilterContract,
        options?: FetchOptions
    ): Observable<TasksActionsTypeEntity[]> {
        return defer(() =>
            this.repository.readAll(tasksActionsTypeFilterVo(contract), options)
        );
    }
}
