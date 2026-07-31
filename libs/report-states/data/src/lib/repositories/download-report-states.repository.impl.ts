import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import {
    DownloadReportStatesFilterContract,
    DownloadReportStatesEntity,
    DownloadReportStatesRepository,
} from '@cmz/report-states-domain';
import { downloadReportStatesFilterMapper } from '../mappers/download-report-states-filter.mapper';
import { DownloadReportStatesItemMapper } from '../mappers/download-report-states-item.mapper';
import { DownloadReportStatesApi } from '../sources/download-report-states.api';

@Service()
export class DownloadReportStatesRepositoryImpl implements DownloadReportStatesRepository {
    private readonly api = inject(DownloadReportStatesApi);
    private readonly mapper = inject(DownloadReportStatesItemMapper);

    execute(
        validContract: DownloadReportStatesFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<DownloadReportStatesEntity>> {
        return this.api
            .execute(
                downloadReportStatesFilterMapper(validContract),
                page,
                options
            )
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }

    export(
        validContract: DownloadReportStatesFilterContract,
        options?: FetchOptions
    ): Observable<DownloadReportStatesEntity[]> {
        return this.api
            .export(downloadReportStatesFilterMapper(validContract), options)
            .pipe(map((response) => this.mapper.mapFromDto(response).items));
    }
}
