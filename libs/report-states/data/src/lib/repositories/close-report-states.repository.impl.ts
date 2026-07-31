import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import {
    CloseReportStatesFilterContract,
    CloseReportStatesEntity,
    CloseReportStatesRepository,
} from '@cmz/report-states-domain';
import { closeReportStatesFilterMapper } from '../mappers/close-report-states-filter.mapper';
import { CloseReportStatesItemMapper } from '../mappers/close-report-states-item.mapper';
import { CloseReportStatesApi } from '../sources/close-report-states.api';

@Service()
export class CloseReportStatesRepositoryImpl implements CloseReportStatesRepository {
    private readonly api = inject(CloseReportStatesApi);
    private readonly mapper = inject(CloseReportStatesItemMapper);

    execute(
        validContract: CloseReportStatesFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<CloseReportStatesEntity>> {
        return this.api
            .execute(
                closeReportStatesFilterMapper(validContract),
                page,
                options
            )
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }

    export(
        validContract: CloseReportStatesFilterContract,
        options?: FetchOptions
    ): Observable<CloseReportStatesEntity[]> {
        return this.api
            .export(closeReportStatesFilterMapper(validContract), options)
            .pipe(map((response) => this.mapper.mapFromDto(response).items));
    }
}
