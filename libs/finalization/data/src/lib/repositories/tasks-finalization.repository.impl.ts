import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import {
    TasksFinalizationFilterContract,
    TasksFinalizationEntity,
    TasksFinalizationRepository,
} from '@cmz/finalization-domain';
import { tasksFinalizationFilterMapper } from '../mappers/tasks-finalization-filter.mapper';
import { TasksFinalizationItemMapper } from '../mappers/tasks-finalization-item.mapper';
import { TasksFinalizationApi } from '../sources/tasks-finalization.api';

@Service()
export class TasksFinalizationRepositoryImpl implements TasksFinalizationRepository {
    private readonly api = inject(TasksFinalizationApi);
    private readonly mapper = inject(TasksFinalizationItemMapper);

    execute(
        validContract: TasksFinalizationFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<TasksFinalizationEntity>> {
        return this.api
            .execute(
                tasksFinalizationFilterMapper(validContract),
                page,
                options
            )
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }

    export(
        validContract: TasksFinalizationFilterContract,
        options?: FetchOptions
    ): Observable<TasksFinalizationEntity[]> {
        return this.api
            .export(tasksFinalizationFilterMapper(validContract), options)
            .pipe(map((response) => this.mapper.mapFromDto(response).items));
    }
}
