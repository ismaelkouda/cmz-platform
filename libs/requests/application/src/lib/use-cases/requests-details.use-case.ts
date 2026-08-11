import { inject, Service } from '@angular/core';
import { defer, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { FetchOptions } from '@cmz/shared-domain';
import {
    RequestsDetailsEntity,
    RequestsDetailsFilterContract,
    RequestsDetailsPermissions,
    RequestsDetailsRepository,
    RequestsDetailsTakeContract,
    RequestsDetailsTakeEntity,
    RequestsDetailsApproveEntity,
    RequestsDetailsQualificationContract,
    RequestsDetailsRejectEntity,
    requestsDetailsQualificationVo,
    requestsDetailsFilterEntity,
    requestsDetailsFilterVo,
    REQUESTS_DETAILS_MODULE_PREFIX,
} from '@cmz/requests-domain';

/**
 * Préfixe des clés i18n d'erreur de validation (`REQUESTS.DETAILS.*`,
 * `apps/backoffice-angular/src/app/i18n/fr/fr-pack-05.ts`) — décision
 * utilisateur (2026-08-11, POC ADR-0020 Option B) : la logique de validation
 * est 100 % partagée dans `@cmz/workflow-details-domain`
 * (`workflowDetails*Vo`, `WorkflowDetails{Approve,Take}Entity`), seul ce
 * préfixe reste propre au module. Source unique `REQUESTS_DETAILS_
 * MODULE_PREFIX` (`@cmz/requests-domain`) — aussi consommée par
 * `requests-details-dialog.component.ts`, pas retapée en dur (audit de
 * cohérence post-refactor : la chaîne était dupliquée dans les 2 fichiers
 * jusqu'à cette correction).
 */
const MODULE_PREFIX = REQUESTS_DETAILS_MODULE_PREFIX;

export interface RequestsDetailsQuery {
    filter: RequestsDetailsFilterContract;
    permissions: RequestsDetailsPermissions;
    options?: FetchOptions;
}

@Service()
export class RequestsDetailsUseCase {
    private readonly repository = inject(RequestsDetailsRepository);

    execute(query: RequestsDetailsQuery): Observable<RequestsDetailsEntity> {
        return defer(() =>
            this.repository
                .execute(
                    requestsDetailsFilterEntity(
                        requestsDetailsFilterVo(query.filter, MODULE_PREFIX)
                    ),
                    query.options
                )
                .pipe(
                    map((entity) => entity.withPermissions(query.permissions))
                )
        );
    }

    take(contract: RequestsDetailsTakeContract): Observable<void> {
        return defer(() =>
            this.repository.take(
                RequestsDetailsTakeEntity.fromContract(contract, MODULE_PREFIX)
            )
        );
    }

    approve(
        details: RequestsDetailsEntity,
        qualification: RequestsDetailsQualificationContract
    ): Observable<void> {
        return defer(() =>
            this.repository.approve(
                RequestsDetailsApproveEntity.fromDetails(
                    details,
                    requestsDetailsQualificationVo(
                        qualification,
                        MODULE_PREFIX
                    ),
                    MODULE_PREFIX
                )
            )
        );
    }

    reject(
        details: RequestsDetailsEntity,
        qualification: RequestsDetailsQualificationContract
    ): Observable<void> {
        return defer(() =>
            this.repository.reject(
                RequestsDetailsRejectEntity.fromDetails(
                    details,
                    requestsDetailsQualificationVo(qualification, MODULE_PREFIX)
                )
            )
        );
    }
}
