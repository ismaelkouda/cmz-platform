import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import {
    RejectReportStatesFilterContract,
    RejectReportStatesEntity,
    RejectReportStatesRepository,
} from '@cmz/report-states-domain';
import { rejectReportStatesFilterMapper } from '../mappers/reject-report-states-filter.mapper';
import { RejectReportStatesItemMapper } from '../mappers/reject-report-states-item.mapper';
import { RejectReportStatesApi } from '../sources/reject-report-states.api';

@Service()
export class RejectReportStatesRepositoryImpl implements RejectReportStatesRepository {
    private readonly api = inject(RejectReportStatesApi);
    private readonly mapper = inject(RejectReportStatesItemMapper);

    execute(
        validContract: RejectReportStatesFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<RejectReportStatesEntity>> {
        return this.api
            .execute(
                rejectReportStatesFilterMapper(validContract),
                page,
                options
            )
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }

    export(
        validContract: RejectReportStatesFilterContract,
        options?: FetchOptions
    ): Observable<RejectReportStatesEntity[]> {
        return this.api
            .export(rejectReportStatesFilterMapper(validContract), options)
            .pipe(map((response) => this.mapper.mapFromDto(response).items));
    }
}
