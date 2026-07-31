import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { TasksActionsTypeFilterValidateContract } from '../contracts/tasks-actions.contract';
import { TasksActionsTypeEntity } from '../entities/tasks-actions-type.entity';

/** Port types d'actions (dropdown formulaire). */
export abstract class TasksActionsTypeRepository {
    abstract readAll(
        filter: TasksActionsTypeFilterValidateContract,
        options?: FetchOptions
    ): Observable<TasksActionsTypeEntity[]>;
}
