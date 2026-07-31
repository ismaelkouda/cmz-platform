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
                        requestsDetailsFilterVo(query.filter)
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
                RequestsDetailsTakeEntity.fromContract(contract)
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
                    requestsDetailsQualificationVo(qualification)
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
                    requestsDetailsQualificationVo(qualification)
                )
            )
        );
    }
}
