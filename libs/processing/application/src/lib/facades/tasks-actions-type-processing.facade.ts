import { computed, inject, Service } from '@angular/core';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import {
    TasksActionsTypeProcessingEntity,
    TasksActionsTypeProcessingFilterContract,
} from '@cmz/processing-domain';
import { TasksActionsTypeProcessingUseCase } from '../use-cases/tasks-actions-type-processing.use-case';

interface TasksActionsTypeParams {
    filter: TasksActionsTypeProcessingFilterContract;
    options?: FetchOptions;
}

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginFacade` (libs/authentication/application/src/lib/facades/login.facade.ts). */
@Service({ autoProvided: false })
export class TasksActionsTypeProcessingFacade extends ResourceFacade<
    TasksActionsTypeProcessingEntity[],
    TasksActionsTypeParams
> {
    private readonly useCase = inject(TasksActionsTypeProcessingUseCase);

    readonly options = computed(() => this.value() ?? []);

    protected stream(
        params: TasksActionsTypeParams
    ): Observable<TasksActionsTypeProcessingEntity[]> {
        return this.useCase.readAll(params.filter, params.options);
    }

    loadTypes(reportUniqId: string, options?: FetchOptions): void {
        this.setParams({ filter: { reportUniqId }, options });
    }
}
