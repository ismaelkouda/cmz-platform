import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { TasksActionsTypeProcessingFilterValidateContract } from '../contracts/tasks-actions-processing.contract';
import { TasksActionsTypeProcessingEntity } from '../entities/tasks-actions-type-processing.entity';

/** Port types d'actions (dropdown formulaire). */
export abstract class TasksActionsTypeProcessingRepository {
    abstract readAll(
        filter: TasksActionsTypeProcessingFilterValidateContract,
        options?: FetchOptions
    ): Observable<TasksActionsTypeProcessingEntity[]>;
}
