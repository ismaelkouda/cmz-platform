import { inject, Service } from '@angular/core';
import { CollectionResourceFacade, PageQuery } from '@cmz/shared-application';
import { PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import {
    TasksActionsCreateContract,
    TasksActionsDeleteContract,
    TasksActionsEntity,
    TasksActionsFilterContract,
    TasksActionsUpdateContract,
} from '@cmz/processing-domain';
import { TasksActionsUseCase } from '../use-cases/tasks-actions.use-case';

@Service()
export class TasksActionsFacade extends CollectionResourceFacade<
    TasksActionsEntity,
    TasksActionsFilterContract
> {
    private readonly useCase = inject(TasksActionsUseCase);

    protected stream(
        params: PageQuery<TasksActionsFilterContract>
    ): Observable<PageResult<TasksActionsEntity>> {
        return this.useCase.execute(
            params.filter ?? {},
            params.page,
            params.options
        );
    }

    create(contract: TasksActionsCreateContract): void {
        this.runAction(
            this.useCase.create(contract),
            'COMMON.SUCCESS.CREATE',
            () => this.reload()
        );
    }

    update(contract: TasksActionsUpdateContract): void {
        this.runAction(
            this.useCase.update(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.reload()
        );
    }

    delete(contract: TasksActionsDeleteContract): void {
        this.runAction(
            this.useCase.delete(contract),
            'COMMON.SUCCESS.DELETE',
            () => this.reload()
        );
    }
}
