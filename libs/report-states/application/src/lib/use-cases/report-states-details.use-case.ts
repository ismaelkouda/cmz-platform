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
                        reportStatesDetailsFilterVo(query.filter)
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
                ReportStatesDetailsTakeEntity.fromContract(contract)
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
                    reportStatesDetailsQualificationVo(qualification)
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
                    reportStatesDetailsQualificationVo(qualification)
                )
            )
        );
    }
}
