import { Observable } from 'rxjs';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import { EvaluateReportStatesEntity } from '../entities/evaluate-report-states.entity';
import { EvaluateReportStatesFilterContract } from '../contracts/evaluate-report-states-filter.contract';

export abstract class EvaluateReportStatesRepository {
    abstract execute(
        validContract: EvaluateReportStatesFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<EvaluateReportStatesEntity>>;

    abstract export(
        validContract: EvaluateReportStatesFilterContract,
        options?: FetchOptions
    ): Observable<EvaluateReportStatesEntity[]>;
}
