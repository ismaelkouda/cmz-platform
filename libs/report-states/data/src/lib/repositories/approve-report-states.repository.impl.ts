import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import {
    ApproveReportStatesFilterContract,
    ApproveReportStatesEntity,
    ApproveReportStatesRepository,
} from '@cmz/report-states-domain';
import { approveReportStatesFilterMapper } from '../mappers/approve-report-states-filter.mapper';
import { ApproveReportStatesItemMapper } from '../mappers/approve-report-states-item.mapper';
import { ApproveReportStatesApi } from '../sources/approve-report-states.api';

@Service()
export class ApproveReportStatesRepositoryImpl implements ApproveReportStatesRepository {
    private readonly api = inject(ApproveReportStatesApi);
    private readonly mapper = inject(ApproveReportStatesItemMapper);

    execute(
        validContract: ApproveReportStatesFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<ApproveReportStatesEntity>> {
        return this.api
            .execute(
                approveReportStatesFilterMapper(validContract),
                page,
                options
            )
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }

    export(
        validContract: ApproveReportStatesFilterContract,
        options?: FetchOptions
    ): Observable<ApproveReportStatesEntity[]> {
        return this.api
            .export(approveReportStatesFilterMapper(validContract), options)
            .pipe(map((response) => this.mapper.mapFromDto(response).items));
    }
}
