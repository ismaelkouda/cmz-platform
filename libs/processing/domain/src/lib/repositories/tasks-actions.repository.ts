import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import {
    TasksActionsCreateValidateContract,
    TasksActionsDeleteValidateContract,
    TasksActionsFilterValidateContract,
    TasksActionsUpdateValidateContract,
} from '../contracts/tasks-actions.contract';
import { TasksActionsEntity } from '../entities/tasks-actions.entity';

/** Port CRUD actions de traitement — tranche C. */
export abstract class TasksActionsRepository {
    abstract execute(
        filter: TasksActionsFilterValidateContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<TasksActionsEntity>>;

    abstract create(
        contract: TasksActionsCreateValidateContract
    ): Observable<MessageEntity>;

    abstract update(
        contract: TasksActionsUpdateValidateContract
    ): Observable<MessageEntity>;

    abstract delete(
        contract: TasksActionsDeleteValidateContract
    ): Observable<MessageEntity>;
}
