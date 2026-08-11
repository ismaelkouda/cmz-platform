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
} from '@cmz/report-states-domain';

/**
 * Préfixe des clés i18n d'erreur de validation (`REPORT_STATES.DETAILS.*`,
 * `apps/backoffice-angular/src/app/i18n/fr/fr-pack-04.ts`) — décision
 * utilisateur (2026-08-11, POC ADR-0020 Option B) : la logique de validation
 * est 100 % partagée dans `@cmz/workflow-details-domain`
 * (`workflowDetails*Vo`, `WorkflowDetails{Approve,Take}Entity`), seul ce
 * préfixe reste propre au module. Seul point du fichier qui change avec
 * l'extraction — les 4 méthodes ci-dessous gardent leur signature publique.
 */
const MODULE_PREFIX = 'REPORT_STATES';

export interface ReportStatesDetailsQuery {
    filter: ReportStatesDetailsFilterContract;
    permissions: ReportStatesDetailsPermissions;
    options?: FetchOptions;
}

@Service()
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
