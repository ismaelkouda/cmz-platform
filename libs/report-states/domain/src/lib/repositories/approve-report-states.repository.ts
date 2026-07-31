import { Observable } from 'rxjs';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import { ApproveReportStatesEntity } from '../entities/approve-report-states.entity';
import { ApproveReportStatesFilterContract } from '../contracts/approve-report-states-filter.contract';

export abstract class ApproveReportStatesRepository {
    abstract execute(
        validContract: ApproveReportStatesFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<ApproveReportStatesEntity>>;

    /** Export métier — même filtre/RBAC que la liste, sans pagination UI. */
    abstract export(
        validContract: ApproveReportStatesFilterContract,
        options?: FetchOptions
    ): Observable<ApproveReportStatesEntity[]>;
}
