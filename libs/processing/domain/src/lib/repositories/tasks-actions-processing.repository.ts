import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import {
    TasksActionsProcessingCreateValidateContract,
    TasksActionsProcessingDeleteValidateContract,
    TasksActionsProcessingFilterValidateContract,
    TasksActionsProcessingUpdateValidateContract,
} from '../contracts/tasks-actions-processing.contract';
import { TasksActionsProcessingEntity } from '../entities/tasks-actions-processing.entity';

/** Port CRUD actions de traitement — tranche C. */
export abstract class TasksActionsProcessingRepository {
    abstract execute(
        filter: TasksActionsProcessingFilterValidateContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<TasksActionsProcessingEntity>>;

    abstract create(
        contract: TasksActionsProcessingCreateValidateContract
    ): Observable<MessageEntity>;

    abstract update(
        contract: TasksActionsProcessingUpdateValidateContract
    ): Observable<MessageEntity>;

    abstract delete(
        contract: TasksActionsProcessingDeleteValidateContract
    ): Observable<MessageEntity>;
}
