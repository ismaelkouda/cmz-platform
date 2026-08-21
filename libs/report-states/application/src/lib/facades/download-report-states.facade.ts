import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { FetchOptions } from '@cmz/shared-domain';
import { PageQuery, PaginatedResourceFacade } from '@cmz/shared-application';
import { PageResult } from '@cmz/shared-domain';
import {
    DownloadReportStatesEntity,
    DownloadReportStatesFilterContract,
} from '@cmz/report-states-domain';
import { DownloadReportStatesUseCase } from '../use-cases/download-report-states.use-case';

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginFacade` (libs/authentication/application/src/lib/facades/login.facade.ts). */
@Service({ autoProvided: false })
export class DownloadReportStatesFacade extends PaginatedResourceFacade<
    DownloadReportStatesEntity,
    DownloadReportStatesFilterContract
> {
    private readonly useCase = inject(DownloadReportStatesUseCase);

    protected stream(
        params: PageQuery<DownloadReportStatesFilterContract>
    ): Observable<PageResult<DownloadReportStatesEntity>> {
        return this.useCase.execute(
            params.filter ?? {},
            params.page,
            params.options
        );
    }

    /** Export métier — dataset complet filtré (hors pagination UI). */
    export(
        filter: DownloadReportStatesFilterContract,
        options?: FetchOptions
    ): Observable<DownloadReportStatesEntity[]> {
        return this.useCase.export(filter, options);
    }
}
