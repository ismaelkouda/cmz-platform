import { Observable } from 'rxjs';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import { RejectReportStatesEntity } from '../entities/reject-report-states.entity';
import { RejectReportStatesFilterContract } from '../contracts/reject-report-states-filter.contract';

export abstract class RejectReportStatesRepository {
    abstract execute(
        validContract: RejectReportStatesFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<RejectReportStatesEntity>>;

    /** Export métier — même filtre/RBAC que la liste, sans pagination UI. */
    abstract export(
        validContract: RejectReportStatesFilterContract,
        options?: FetchOptions
    ): Observable<RejectReportStatesEntity[]>;
}
