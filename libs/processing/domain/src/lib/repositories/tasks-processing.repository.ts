import { Observable } from 'rxjs';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import { TasksProcessingFilterContract } from '../contracts/tasks-processing-filter.contract';
import { TasksProcessingEntity } from '../entities/tasks-processing.entity';

export abstract class TasksProcessingRepository {
    abstract execute(
        filter: TasksProcessingFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<TasksProcessingEntity>>;

    abstract export(
        filter: TasksProcessingFilterContract,
        options?: FetchOptions
    ): Observable<TasksProcessingEntity[]>;
}
