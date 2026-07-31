import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { PageQuery, PaginatedResourceFacade } from '@cmz/shared-application';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import {
    EvaluateReportStatesEntity,
    EvaluateReportStatesFilterContract,
} from '@cmz/report-states-domain';
import { EvaluateReportStatesUseCase } from '../use-cases/evaluate-report-states.use-case';

@Service()
export class EvaluateReportStatesFacade extends PaginatedResourceFacade<
    EvaluateReportStatesEntity,
    EvaluateReportStatesFilterContract
> {
    private readonly useCase = inject(EvaluateReportStatesUseCase);

    protected stream(
        params: PageQuery<EvaluateReportStatesFilterContract>
    ): Observable<PageResult<EvaluateReportStatesEntity>> {
        return this.useCase.execute(
            params.filter ?? {},
            params.page,
            params.options
        );
    }

    export(
        filter: EvaluateReportStatesFilterContract,
        options?: FetchOptions
    ): Observable<EvaluateReportStatesEntity[]> {
        return this.useCase.export(filter, options);
    }
}
