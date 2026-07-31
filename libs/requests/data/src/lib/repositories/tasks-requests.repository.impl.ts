import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import {
    TasksRequestsFilterContract,
    TasksRequestsEntity,
    TasksRequestsRepository,
} from '@cmz/requests-domain';
import { tasksRequestsFilterMapper } from '../mappers/tasks-requests-filter.mapper';
import { TasksRequestsItemMapper } from '../mappers/tasks-requests-item.mapper';
import { TasksRequestsApi } from '../sources/tasks-requests.api';

@Service()
export class TasksRequestsRepositoryImpl implements TasksRequestsRepository {
    private readonly api = inject(TasksRequestsApi);
    private readonly mapper = inject(TasksRequestsItemMapper);

    execute(
        validContract: TasksRequestsFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<TasksRequestsEntity>> {
        return this.api
            .execute(tasksRequestsFilterMapper(validContract), page, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }

    export(
        validContract: TasksRequestsFilterContract,
        options?: FetchOptions
    ): Observable<TasksRequestsEntity[]> {
        return this.api
            .export(tasksRequestsFilterMapper(validContract), options)
            .pipe(map((response) => this.mapper.mapFromDto(response).items));
    }
}
