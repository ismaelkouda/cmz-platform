import { Observable } from 'rxjs';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import { TasksRequestsEntity } from '../entities/tasks-requests.entity';
import { TasksRequestsFilterContract } from '../contracts/tasks-requests-filter.contract';

export abstract class TasksRequestsRepository {
    abstract execute(
        validContract: TasksRequestsFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<TasksRequestsEntity>>;

    abstract export(
        validContract: TasksRequestsFilterContract,
        options?: FetchOptions
    ): Observable<TasksRequestsEntity[]>;
}
