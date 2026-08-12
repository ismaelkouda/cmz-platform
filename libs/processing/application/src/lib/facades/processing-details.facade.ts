import { inject, Service, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { finalize } from 'rxjs/operators';
import {
    PermissionActionsService,
    ResourceFacade,
    TranslationPort,
    NOTIFICATION_PORT,
} from '@cmz/shared-application';
import { FetchOptions } from '@cmz/shared-domain';
import {
    ProcessingDetailsEntity,
    ProcessingDetailsFilterContract,
    ProcessingDetailsTakeContract,
    ProcessingDetailsTreatContract,
    PROCESSING_QUEUES_ROUTE,
    PROCESSING_TASKS_ROUTE,
} from '@cmz/processing-domain';
import {
    ProcessingDetailsQuery,
    ProcessingDetailsUseCase,
} from '../use-cases/processing-details.use-case';
import { AllProcessingFacade } from './all-processing.facade';
import { QueuesProcessingFacade } from './queues-processing.facade';
import { TasksProcessingFacade } from './tasks-processing.facade';

export interface ProcessingDetailsLoadParams {
    filter: ProcessingDetailsFilterContract;
    options?: FetchOptions;
}

/** Façade fiche signalement + mutations take/treat (tranche B). */
@Service()
export class ProcessingDetailsFacade extends ResourceFacade<
    ProcessingDetailsEntity,
    ProcessingDetailsLoadParams
> {
    private readonly useCase = inject(ProcessingDetailsUseCase);
    private readonly permissions = inject(PermissionActionsService);
    private readonly notification = inject(NOTIFICATION_PORT);
    private readonly i18n = inject(TranslationPort);
    private readonly queuesFacade = inject(QueuesProcessingFacade);
    private readonly tasksFacade = inject(TasksProcessingFacade);
    private readonly allFacade = inject(AllProcessingFacade);

    private readonly _actionLoading = signal(false);
    readonly actionLoading = this._actionLoading.asReadonly();

    protected stream(
        params: ProcessingDetailsLoadParams
    ): Observable<ProcessingDetailsEntity> {
        const query: ProcessingDetailsQuery = {
            filter: params.filter,
            permissions: this.resolvePermissions(),
            options: params.options,
        };
        return this.useCase.execute(query);
    }

    loadDetails(uniqId: string, options?: FetchOptions): void {
        this.setParams({ filter: { uniqId }, options });
    }

    take(contract: ProcessingDetailsTakeContract): void {
        this._actionLoading.set(true);
        this.useCase
            .take(contract)
            .pipe(
                tap(() => {
                    this.notification.success(
                        this.i18n.translate('COMMON.SUCCESS.TAKE')
                    );
                    this.queuesFacade.reload();
                    this.tasksFacade.reload();
                }),
                finalize(() => this._actionLoading.set(false))
            )
            .subscribe();
    }

    treat(contract: ProcessingDetailsTreatContract): void {
        this._actionLoading.set(true);
        this.useCase
            .treat(contract)
            .pipe(
                tap(() => {
                    this.notification.success(
                        this.i18n.translate('COMMON.SUCCESS.TREAT')
                    );
                    this.tasksFacade.reload();
                    this.allFacade.reload();
                }),
                finalize(() => this._actionLoading.set(false))
            )
            .subscribe();
    }

    private resolvePermissions() {
        return {
            canTake: this.permissions.can(PROCESSING_QUEUES_ROUTE, 'take')(),
            canTreat: this.permissions.can(PROCESSING_TASKS_ROUTE, 'treat')(),
        };
    }
}
