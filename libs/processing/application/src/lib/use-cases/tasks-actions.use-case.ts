import { inject, Service } from '@angular/core';
import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import { Observable, defer } from 'rxjs';
import {
    TasksActionsCreateContract,
    TasksActionsDeleteContract,
    TasksActionsEntity,
    TasksActionsFilterContract,
    TasksActionsRepository,
    TasksActionsUpdateContract,
    tasksActionsCreateVo,
    tasksActionsDeleteVo,
    tasksActionsFilterVo,
    tasksActionsUpdateVo,
} from '@cmz/processing-domain';

@Service()
export class TasksActionsUseCase {
    private readonly repository = inject(TasksActionsRepository);

    execute(
        contract: TasksActionsFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<TasksActionsEntity>> {
        return defer(() =>
            this.repository.execute(
                tasksActionsFilterVo(contract),
                page,
                options
            )
        );
    }

    create(contract: TasksActionsCreateContract): Observable<MessageEntity> {
        return defer(() =>
            this.repository.create(tasksActionsCreateVo(contract))
        );
    }

    update(contract: TasksActionsUpdateContract): Observable<MessageEntity> {
        return defer(() =>
            this.repository.update(tasksActionsUpdateVo(contract))
        );
    }

    delete(contract: TasksActionsDeleteContract): Observable<MessageEntity> {
        return defer(() =>
            this.repository.delete(tasksActionsDeleteVo(contract))
        );
    }
}
