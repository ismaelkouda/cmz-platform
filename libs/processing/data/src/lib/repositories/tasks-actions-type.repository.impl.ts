import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { FetchOptions } from '@cmz/shared-domain';
import {
    TasksActionsTypeEntity,
    TasksActionsTypeFilterValidateContract,
    TasksActionsTypeRepository,
} from '@cmz/processing-domain';
import { tasksActionsTypeFilterMapper } from '../mappers/tasks-actions-type-filter.mapper';
import { TasksActionsTypeMapper } from '../mappers/tasks-actions-type.mapper';
import { TasksActionsTypeApi } from '../sources/tasks-actions-type.api';

@Service()
export class TasksActionsTypeRepositoryImpl implements TasksActionsTypeRepository {
    private readonly api = inject(TasksActionsTypeApi);
    private readonly mapper = inject(TasksActionsTypeMapper);

    readAll(
        filter: TasksActionsTypeFilterValidateContract,
        options?: FetchOptions
    ): Observable<TasksActionsTypeEntity[]> {
        return this.api
            .readAll(tasksActionsTypeFilterMapper(filter), options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
