import { Observable } from 'rxjs';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import { CloseReportStatesEntity } from '../entities/close-report-states.entity';
import { CloseReportStatesFilterContract } from '../contracts/close-report-states-filter.contract';

export abstract class CloseReportStatesRepository {
    abstract execute(
        validContract: CloseReportStatesFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<CloseReportStatesEntity>>;

    abstract export(
        validContract: CloseReportStatesFilterContract,
        options?: FetchOptions
    ): Observable<CloseReportStatesEntity[]>;
}
