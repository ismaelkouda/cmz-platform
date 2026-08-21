import { inject, Service } from '@angular/core';
import { defer, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { FetchOptions } from '@cmz/shared-domain';
import {
    ReportStatesDetailsEntity,
    ReportStatesDetailsFilterContract,
    ReportStatesDetailsPermissions,
    ReportStatesDetailsRepository,
    ReportStatesDetailsTakeContract,
    ReportStatesDetailsTakeEntity,
    ReportStatesDetailsApproveEntity,
    ReportStatesDetailsQualificationContract,
    ReportStatesDetailsRejectEntity,
    reportStatesDetailsQualificationVo,
    reportStatesDetailsFilterEntity,
    reportStatesDetailsFilterVo,
    REPORT_STATES_DETAILS_MODULE_PREFIX,
} from '@cmz/report-states-domain';

/**
 * Préfixe des clés i18n d'erreur de validation (`REPORT_STATES.DETAILS.*`,
 * `apps/backoffice-angular/src/app/i18n/fr/fr-pack-04.ts`) — décision
 * utilisateur (2026-08-11, POC ADR-0020 Option B) : la logique de validation
 * est 100 % partagée dans `@cmz/workflow-details-domain`
 * (`workflowDetails*Vo`, `WorkflowDetails{Approve,Take}Entity`), seul ce
 * préfixe reste propre au module. Source unique `REPORT_STATES_DETAILS_
 * MODULE_PREFIX` (`@cmz/report-states-domain`) — aussi consommée par
 * `report-states-details-dialog.component.ts`, pas retapée en dur (audit
 * de cohérence post-refactor : la chaîne était dupliquée dans les 2
 * fichiers jusqu'à cette correction).
 */
const MODULE_PREFIX = REPORT_STATES_DETAILS_MODULE_PREFIX;

export interface ReportStatesDetailsQuery {
    filter: ReportStatesDetailsFilterContract;
    permissions: ReportStatesDetailsPermissions;
    options?: FetchOptions;
}

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginUseCase` (libs/authentication/application/src/lib/use-cases/login.use-case.ts). */
@Service({ autoProvided: false })
export class ReportStatesDetailsUseCase {
    private readonly repository = inject(ReportStatesDetailsRepository);

    execute(
        query: ReportStatesDetailsQuery
    ): Observable<ReportStatesDetailsEntity> {
        return defer(() =>
            this.repository
                .execute(
                    reportStatesDetailsFilterEntity(
                        reportStatesDetailsFilterVo(query.filter, MODULE_PREFIX)
                    ),
                    query.options
                )
                .pipe(
                    map((entity) => entity.withPermissions(query.permissions))
                )
        );
    }

    take(contract: ReportStatesDetailsTakeContract): Observable<void> {
        return defer(() =>
            this.repository.take(
                ReportStatesDetailsTakeEntity.fromContract(
                    contract,
                    MODULE_PREFIX
                )
            )
        );
    }

    approve(
        details: ReportStatesDetailsEntity,
        qualification: ReportStatesDetailsQualificationContract
    ): Observable<void> {
        return defer(() =>
            this.repository.approve(
                ReportStatesDetailsApproveEntity.fromDetails(
                    details,
                    reportStatesDetailsQualificationVo(
                        qualification,
                        MODULE_PREFIX
                    ),
                    MODULE_PREFIX
                )
            )
        );
    }

    reject(
        details: ReportStatesDetailsEntity,
        qualification: ReportStatesDetailsQualificationContract
    ): Observable<void> {
        return defer(() =>
            this.repository.reject(
                ReportStatesDetailsRejectEntity.fromDetails(
                    details,
                    reportStatesDetailsQualificationVo(
                        qualification,
                        MODULE_PREFIX
                    )
                )
            )
        );
    }
}
