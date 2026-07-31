import { computed, inject, Service } from '@angular/core';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import {
    TasksActionsTypeEntity,
    TasksActionsTypeFilterContract,
} from '@cmz/processing-domain';
import { TasksActionsTypeUseCase } from '../use-cases/tasks-actions-type.use-case';

interface TasksActionsTypeParams {
    filter: TasksActionsTypeFilterContract;
    options?: FetchOptions;
}

@Service()
export class TasksActionsTypeFacade extends ResourceFacade<
    TasksActionsTypeEntity[],
    TasksActionsTypeParams
> {
    private readonly useCase = inject(TasksActionsTypeUseCase);

    readonly options = computed(() => this.value() ?? []);

    protected stream(
        params: TasksActionsTypeParams
    ): Observable<TasksActionsTypeEntity[]> {
        return this.useCase.readAll(params.filter, params.options);
    }

    loadTypes(reportUniqId: string, options?: FetchOptions): void {
        this.setParams({ filter: { reportUniqId }, options });
    }
}
