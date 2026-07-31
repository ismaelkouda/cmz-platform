import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { FetchOptions } from '@cmz/shared-domain';
import {
    TasksActionsTypeProcessingEntity,
    TasksActionsTypeProcessingFilterValidateContract,
    TasksActionsTypeProcessingRepository,
} from '@cmz/processing-domain';
import { tasksActionsTypeFilterMapper } from '../mappers/tasks-actions-processing-type-filter.mapper';
import { TasksActionsTypeProcessingMapper } from '../mappers/tasks-actions-processing-type.mapper';
import { TasksActionsTypeProcessingApi } from '../sources/tasks-actions-processing-type.api';

@Service()
export class TasksActionsTypeProcessingRepositoryImpl implements TasksActionsTypeProcessingRepository {
    private readonly api = inject(TasksActionsTypeProcessingApi);
    private readonly mapper = inject(TasksActionsTypeProcessingMapper);

    readAll(
        filter: TasksActionsTypeProcessingFilterValidateContract,
        options?: FetchOptions
    ): Observable<TasksActionsTypeProcessingEntity[]> {
        return this.api
            .readAll(tasksActionsTypeFilterMapper(filter), options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
