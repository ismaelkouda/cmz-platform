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
} from '@cmz/requests-domain';

/**
 * Préfixe des clés i18n d'erreur de validation (`REQUESTS.DETAILS.*`,
 * `apps/backoffice-angular/src/app/i18n/fr/fr-pack-05.ts`) — décision
 * utilisateur (2026-08-11, POC ADR-0020 Option B) : la logique de validation
 * est 100 % partagée dans `@cmz/workflow-details-domain`
 * (`workflowDetails*Vo`, `WorkflowDetails{Approve,Take}Entity`), seul ce
 * préfixe reste propre au module. Seul point du fichier qui change avec
 * l'extraction — les 4 méthodes ci-dessous gardent leur signature publique.
 */
const MODULE_PREFIX = 'REQUESTS';

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
