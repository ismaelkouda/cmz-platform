import { inject, Service } from '@angular/core';
import { defer, Observable } from 'rxjs';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import {
    DownloadReportStatesEntity,
    DownloadReportStatesFilterContract,
    DownloadReportStatesRepository,
    downloadReportStatesFilterEntity,
    downloadReportStatesFilterVo,
} from '@cmz/report-states-domain';

@Service()
export class DownloadReportStatesUseCase {
    private readonly repository = inject(DownloadReportStatesRepository);

    execute(
        contract: DownloadReportStatesFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<DownloadReportStatesEntity>> {
        return defer(() =>
            this.repository.execute(
                downloadReportStatesFilterEntity(
                    downloadReportStatesFilterVo(contract)
                ),
                page,
                options
            )
        );
    }

    export(
        contract: DownloadReportStatesFilterContract,
        options?: FetchOptions
    ): Observable<DownloadReportStatesEntity[]> {
        return defer(() =>
            this.repository.export(
                downloadReportStatesFilterEntity(
                    downloadReportStatesFilterVo(contract)
                ),
                options
            )
        );
    }
}
