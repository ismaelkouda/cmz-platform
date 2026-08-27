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
    RequestsDetailsEntity,
    RequestsDetailsFilterContract,
    RequestsDetailsQualificationContract,
    RequestsDetailsTakeContract,
    REQUESTS_QUEUES_ROUTE,
    REQUESTS_TASKS_ROUTE,
} from '@cmz/requests-domain';
import {
    RequestsDetailsQuery,
    RequestsDetailsUseCase,
} from '../use-cases/requests-details.use-case';
import { AllRequestsFacade } from './all-requests.facade';
import { QueuesRequestsFacade } from './queues-requests.facade';
import { TasksRequestsFacade } from './tasks-requests.facade';
import { TranslocoService } from '@jsverse/transloco';

export interface RequestsDetailsLoadParams {
    filter: RequestsDetailsFilterContract;
    options?: FetchOptions;
}

/**
 * Façade fiche demande + mutations take/approve/reject (tranche B).
 *
 * `autoProvided: false` (OPS-25bis) — voir docstring de `LoginFacade` (libs/authentication/application/src/lib/facades/login.facade.ts).
 */
@Service({ autoProvided: false })
export class RequestsDetailsFacade extends ResourceFacade<
    RequestsDetailsEntity,
    RequestsDetailsLoadParams
> {
    private readonly useCase = inject(RequestsDetailsUseCase);
    private readonly permissions = inject(PermissionActionsService);
    private readonly notification = inject(NOTIFICATION_PORT);
    private readonly i18n = inject(TranslocoService);
    private readonly queuesFacade = inject(QueuesRequestsFacade);
    private readonly tasksFacade = inject(TasksRequestsFacade);
    private readonly allFacade = inject(AllRequestsFacade);

    private readonly _actionLoading = signal(false);
    readonly actionLoading = this._actionLoading.asReadonly();

    protected stream(
        params: RequestsDetailsLoadParams
    ): Observable<RequestsDetailsEntity> {
        const query: RequestsDetailsQuery = {
            filter: params.filter,
            permissions: this.resolvePermissions(),
            options: params.options,
        };
        return this.useCase.execute(query);
    }

    loadDetails(uniqId: string, options?: FetchOptions): void {
        this.setParams({ filter: { uniqId }, options });
    }

    take(contract: RequestsDetailsTakeContract): void {
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

    approve(
        details: RequestsDetailsEntity,
        qualification: RequestsDetailsQualificationContract
    ): void {
        this._actionLoading.set(true);
        this.useCase
            .approve(details, qualification)
            .pipe(
                tap(() => {
                    this.notification.success(
                        this.i18n.translate('COMMON.SUCCESS.APPROVE')
                    );
                    this.tasksFacade.reload();
                    this.allFacade.reload();
                }),
                finalize(() => this._actionLoading.set(false))
            )
            .subscribe();
    }

    reject(
        details: RequestsDetailsEntity,
        qualification: RequestsDetailsQualificationContract
    ): void {
        this._actionLoading.set(true);
        this.useCase
            .reject(details, qualification)
            .pipe(
                tap(() => {
                    this.notification.success(
                        this.i18n.translate('COMMON.SUCCESS.REJECT')
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
            canTake: this.permissions.can(REQUESTS_QUEUES_ROUTE, 'take')(),
            canQualify: this.permissions.can(REQUESTS_TASKS_ROUTE, 'approve')(),
        };
    }
}
