import { Observable } from 'rxjs';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import { DownloadReportStatesEntity } from '../entities/download-report-states.entity';
import { DownloadReportStatesFilterContract } from '../contracts/download-report-states-filter.contract';

export abstract class DownloadReportStatesRepository {
    abstract execute(
        validContract: DownloadReportStatesFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<DownloadReportStatesEntity>>;

    /** Export métier — même filtre/RBAC que la liste, sans pagination UI. */
    abstract export(
        validContract: DownloadReportStatesFilterContract,
        options?: FetchOptions
    ): Observable<DownloadReportStatesEntity[]>;
}
