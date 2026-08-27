import { inject, Service, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { finalize } from 'rxjs/operators';
import {
    PermissionActionsService,
    ResourceFacade,
    NOTIFICATION_PORT,
} from '@cmz/shared-application';
import { FetchOptions } from '@cmz/shared-domain';
import {
    FinalizationDetailsEntity,
    FinalizationDetailsFilterContract,
    FinalizationDetailsFinalizeContract,
    FinalizationDetailsTakeContract,
    FINALIZATION_QUEUES_ROUTE,
    FINALIZATION_TASKS_ROUTE,
} from '@cmz/finalization-domain';
import {
    FinalizationDetailsQuery,
    FinalizationDetailsUseCase,
} from '../use-cases/finalization-details.use-case';
import { AllFinalizationFacade } from './all-finalization.facade';
import { QueuesFinalizationFacade } from './queues-finalization.facade';
import { TasksFinalizationFacade } from './tasks-finalization.facade';
import { TranslocoService } from '@jsverse/transloco';

export interface FinalizationDetailsLoadParams {
    filter: FinalizationDetailsFilterContract;
    options?: FetchOptions;
}

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginFacade` (libs/authentication/application/src/lib/facades/login.facade.ts). */
@Service({ autoProvided: false })
export class FinalizationDetailsFacade extends ResourceFacade<
    FinalizationDetailsEntity,
    FinalizationDetailsLoadParams
> {
    private readonly useCase = inject(FinalizationDetailsUseCase);
    private readonly permissions = inject(PermissionActionsService);
    private readonly notification = inject(NOTIFICATION_PORT);
    private readonly i18n = inject(TranslocoService);
    private readonly queuesFacade = inject(QueuesFinalizationFacade);
    private readonly tasksFacade = inject(TasksFinalizationFacade);
    private readonly allFacade = inject(AllFinalizationFacade);

    private readonly _actionLoading = signal(false);
    readonly actionLoading = this._actionLoading.asReadonly();

    protected stream(
        params: FinalizationDetailsLoadParams
    ): Observable<FinalizationDetailsEntity> {
        const query: FinalizationDetailsQuery = {
            filter: params.filter,
            permissions: this.resolvePermissions(),
            options: params.options,
        };
        return this.useCase.execute(query);
    }

    loadDetails(uniqId: string, options?: FetchOptions): void {
        this.setParams({ filter: { uniqId }, options });
    }

    take(contract: FinalizationDetailsTakeContract): void {
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

    finalize(contract: FinalizationDetailsFinalizeContract): void {
        this._actionLoading.set(true);
        this.useCase
            .finalize(contract)
            .pipe(
                tap(() => {
                    this.notification.success(
                        this.i18n.translate('COMMON.SUCCESS.FINALIZE')
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
            canTake: this.permissions.can(FINALIZATION_QUEUES_ROUTE, 'take')(),
            canFinalize: this.permissions.can(
                FINALIZATION_TASKS_ROUTE,
                'finalize'
            )(),
        };
    }
}
