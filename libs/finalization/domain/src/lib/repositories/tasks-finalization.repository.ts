import { Observable } from 'rxjs';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import { TasksFinalizationEntity } from '../entities/tasks-finalization.entity';
import { TasksFinalizationFilterContract } from '../contracts/tasks-finalization-filter.contract';

export abstract class TasksFinalizationRepository {
    abstract execute(
        validContract: TasksFinalizationFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<TasksFinalizationEntity>>;

    abstract export(
        validContract: TasksFinalizationFilterContract,
        options?: FetchOptions
    ): Observable<TasksFinalizationEntity[]>;
}
