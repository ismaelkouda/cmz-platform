import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { unwrapResponse } from '@cmz/shared-data';
import { FetchOptions } from '@cmz/shared-domain';
import {
    ReportStatesDetailsEntity,
    ReportStatesDetailsFilterContract,
    ReportStatesDetailsRepository,
    ReportStatesDetailsApproveEntity,
    ReportStatesDetailsRejectEntity,
    ReportStatesDetailsTakeEntity,
} from '@cmz/report-states-domain';
import { reportStatesDetailsFilterMapper } from '../mappers/report-states-details-filter.mapper';
import { ReportStatesDetailsMapper } from '../mappers/report-states-details.mapper';
import { reportStatesDetailsTakeMapper } from '../mappers/report-states-details-take.mapper';
import { reportStatesDetailsApproveMapper } from '../mappers/report-states-details-approve.mapper';
import { reportStatesDetailsRejectMapper } from '../mappers/report-states-details-reject.mapper';
import { ReportStatesDetailsApi } from '../sources/report-states-details.api';

@Service()
export class ReportStatesDetailsRepositoryImpl implements ReportStatesDetailsRepository {
    private readonly api = inject(ReportStatesDetailsApi);
    private readonly mapper = inject(ReportStatesDetailsMapper);

    execute(
        validContract: ReportStatesDetailsFilterContract,
        options?: FetchOptions
    ): Observable<ReportStatesDetailsEntity> {
        return this.api
            .execute(reportStatesDetailsFilterMapper(validContract), options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }

    take(entity: ReportStatesDetailsTakeEntity): Observable<void> {
        return this.api
            .take(reportStatesDetailsTakeMapper(entity))
            .pipe(map((response) => unwrapResponse(response)));
    }

    approve(entity: ReportStatesDetailsApproveEntity): Observable<void> {
        return this.api
            .approve(reportStatesDetailsApproveMapper(entity))
            .pipe(map((response) => unwrapResponse(response)));
    }

    reject(entity: ReportStatesDetailsRejectEntity): Observable<void> {
        return this.api
            .reject(reportStatesDetailsRejectMapper(entity))
            .pipe(map((response) => unwrapResponse(response)));
    }
}
