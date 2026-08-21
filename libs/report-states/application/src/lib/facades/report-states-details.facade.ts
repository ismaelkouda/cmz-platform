import { inject, Service, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { finalize } from 'rxjs/operators';
import {
    PermissionActionsService,
    ResourceFacade,
    NOTIFICATION_PORT,
    TRANSLATION_PORT,
} from '@cmz/shared-application';
import { FetchOptions } from '@cmz/shared-domain';
import {
    ReportStatesDetailsEntity,
    ReportStatesDetailsFilterContract,
    ReportStatesDetailsQualificationContract,
    ReportStatesDetailsTakeContract,
    REPORT_STATES_APPROVE_ROUTE,
    REPORT_STATES_EVALUATE_ROUTE,
} from '@cmz/report-states-domain';
import {
    ReportStatesDetailsQuery,
    ReportStatesDetailsUseCase,
} from '../use-cases/report-states-details.use-case';
import { ApproveReportStatesFacade } from './approve-report-states.facade';
import { EvaluateReportStatesFacade } from './evaluate-report-states.facade';
import { RejectReportStatesFacade } from './reject-report-states.facade';

export interface ReportStatesDetailsLoadParams {
    filter: ReportStatesDetailsFilterContract;
    options?: FetchOptions;
}

/** Façade fiche signalement + mutations take/approve/reject. */
/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginFacade` (libs/authentication/application/src/lib/facades/login.facade.ts). */
@Service({ autoProvided: false })
export class ReportStatesDetailsFacade extends ResourceFacade<
    ReportStatesDetailsEntity,
    ReportStatesDetailsLoadParams
> {
    private readonly useCase = inject(ReportStatesDetailsUseCase);
    private readonly permissions = inject(PermissionActionsService);
    private readonly notification = inject(NOTIFICATION_PORT);
    private readonly i18n = inject(TRANSLATION_PORT);
    private readonly approveFacade = inject(ApproveReportStatesFacade);
    private readonly evaluateFacade = inject(EvaluateReportStatesFacade);
    private readonly rejectFacade = inject(RejectReportStatesFacade);

    private readonly _actionLoading = signal(false);
    readonly actionLoading = this._actionLoading.asReadonly();

    protected stream(
        params: ReportStatesDetailsLoadParams
    ): Observable<ReportStatesDetailsEntity> {
        const query: ReportStatesDetailsQuery = {
            filter: params.filter,
            permissions: this.resolvePermissions(),
            options: params.options,
        };
        return this.useCase.execute(query);
    }

    loadDetails(uniqId: string, options?: FetchOptions): void {
        this.setParams({ filter: { uniqId }, options });
    }

    take(contract: ReportStatesDetailsTakeContract): void {
        this._actionLoading.set(true);
        this.useCase
            .take(contract)
            .pipe(
                tap(() => {
                    this.notification.success(
                        this.i18n.translate('COMMON.SUCCESS.TAKE')
                    );
                    this.approveFacade.reload();
                    this.evaluateFacade.reload();
                }),
                finalize(() => this._actionLoading.set(false))
            )
            .subscribe();
    }

    approve(
        details: ReportStatesDetailsEntity,
        qualification: ReportStatesDetailsQualificationContract
    ): void {
        this._actionLoading.set(true);
        this.useCase
            .approve(details, qualification)
            .pipe(
                tap(() => {
                    this.notification.success(
                        this.i18n.translate('COMMON.SUCCESS.APPROVE')
                    );
                    this.approveFacade.reload();
                    this.evaluateFacade.reload();
                }),
                finalize(() => this._actionLoading.set(false))
            )
            .subscribe();
    }

    reject(
        details: ReportStatesDetailsEntity,
        qualification: ReportStatesDetailsQualificationContract
    ): void {
        this._actionLoading.set(true);
        this.useCase
            .reject(details, qualification)
            .pipe(
                tap(() => {
                    this.notification.success(
                        this.i18n.translate('COMMON.SUCCESS.REJECT')
                    );
                    this.rejectFacade.reload();
                    this.evaluateFacade.reload();
                }),
                finalize(() => this._actionLoading.set(false))
            )
            .subscribe();
    }

    private resolvePermissions() {
        return {
            canTake: this.permissions.can(
                REPORT_STATES_APPROVE_ROUTE,
                'take'
            )(),
            canQualify: this.permissions.can(
                REPORT_STATES_EVALUATE_ROUTE,
                'approve'
            )(),
        };
    }
}
