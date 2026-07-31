import { inject, Service } from '@angular/core';
import { CollectionResourceFacade, PageQuery } from '@cmz/shared-application';
import { PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import {
    TasksActionsProcessingCreateContract,
    TasksActionsProcessingDeleteContract,
    TasksActionsProcessingEntity,
    TasksActionsProcessingFilterContract,
    TasksActionsProcessingUpdateContract,
} from '@cmz/processing-domain';
import { TasksActionsProcessingUseCase } from '../use-cases/tasks-actions-processing.use-case';

@Service()
export class TasksActionsProcessingFacade extends CollectionResourceFacade<
    TasksActionsProcessingEntity,
    TasksActionsProcessingFilterContract
> {
    private readonly useCase = inject(TasksActionsProcessingUseCase);

    protected stream(
        params: PageQuery<TasksActionsProcessingFilterContract>
    ): Observable<PageResult<TasksActionsProcessingEntity>> {
        return this.useCase.execute(
            params.filter ?? {},
            params.page,
            params.options
        );
    }

    create(contract: TasksActionsProcessingCreateContract): void {
        this.runAction(
            this.useCase.create(contract),
            'COMMON.SUCCESS.CREATE',
            () => this.reload()
        );
    }

    update(contract: TasksActionsProcessingUpdateContract): void {
        this.runAction(
            this.useCase.update(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.reload()
        );
    }

    delete(contract: TasksActionsProcessingDeleteContract): void {
        this.runAction(
            this.useCase.delete(contract),
            'COMMON.SUCCESS.DELETE',
            () => this.reload()
        );
    }
}
