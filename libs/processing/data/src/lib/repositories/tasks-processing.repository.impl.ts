import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import {
    TasksProcessingFilterContract,
    TasksProcessingEntity,
    TasksProcessingRepository,
} from '@cmz/processing-domain';
import { tasksProcessingFilterMapper } from '../mappers/tasks-processing-filter.mapper';
import { TasksProcessingItemMapper } from '../mappers/tasks-processing-item.mapper';
import { TasksProcessingApi } from '../sources/tasks-processing.api';

@Service()
export class TasksProcessingRepositoryImpl implements TasksProcessingRepository {
    private readonly api = inject(TasksProcessingApi);
    private readonly mapper = inject(TasksProcessingItemMapper);

    execute(
        validContract: TasksProcessingFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<TasksProcessingEntity>> {
        return this.api
            .execute(tasksProcessingFilterMapper(validContract), page, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }

    export(
        validContract: TasksProcessingFilterContract,
        options?: FetchOptions
    ): Observable<TasksProcessingEntity[]> {
        return this.api
            .export(tasksProcessingFilterMapper(validContract), options)
            .pipe(map((response) => this.mapper.mapFromDto(response).items));
    }
}
