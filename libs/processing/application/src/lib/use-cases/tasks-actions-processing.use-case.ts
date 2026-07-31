import { inject, Service } from '@angular/core';
import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import { Observable, defer } from 'rxjs';
import {
    TasksActionsProcessingCreateContract,
    TasksActionsProcessingDeleteContract,
    TasksActionsProcessingEntity,
    TasksActionsProcessingFilterContract,
    TasksActionsProcessingRepository,
    TasksActionsProcessingUpdateContract,
    tasksActionsProcessingCreateVo,
    tasksActionsProcessingDeleteVo,
    tasksActionsProcessingFilterVo,
    tasksActionsProcessingUpdateVo,
} from '@cmz/processing-domain';

@Service()
export class TasksActionsProcessingUseCase {
    private readonly repository = inject(TasksActionsProcessingRepository);

    execute(
        contract: TasksActionsProcessingFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<TasksActionsProcessingEntity>> {
        return defer(() =>
            this.repository.execute(
                tasksActionsProcessingFilterVo(contract),
                page,
                options
            )
        );
    }

    create(
        contract: TasksActionsProcessingCreateContract
    ): Observable<MessageEntity> {
        return defer(() =>
            this.repository.create(tasksActionsProcessingCreateVo(contract))
        );
    }

    update(
        contract: TasksActionsProcessingUpdateContract
    ): Observable<MessageEntity> {
        return defer(() =>
            this.repository.update(tasksActionsProcessingUpdateVo(contract))
        );
    }

    delete(
        contract: TasksActionsProcessingDeleteContract
    ): Observable<MessageEntity> {
        return defer(() =>
            this.repository.delete(tasksActionsProcessingDeleteVo(contract))
        );
    }
}
