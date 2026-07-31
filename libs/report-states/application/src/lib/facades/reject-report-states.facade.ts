import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { FetchOptions } from '@cmz/shared-domain';
import { PageQuery, PaginatedResourceFacade } from '@cmz/shared-application';
import { PageResult } from '@cmz/shared-domain';
import {
    RejectReportStatesEntity,
    RejectReportStatesFilterContract,
} from '@cmz/report-states-domain';
import { RejectReportStatesUseCase } from '../use-cases/reject-report-states.use-case';

@Service()
export class RejectReportStatesFacade extends PaginatedResourceFacade<
    RejectReportStatesEntity,
    RejectReportStatesFilterContract
> {
    private readonly useCase = inject(RejectReportStatesUseCase);

    protected stream(
        params: PageQuery<RejectReportStatesFilterContract>
    ): Observable<PageResult<RejectReportStatesEntity>> {
        return this.useCase.execute(
            params.filter ?? {},
            params.page,
            params.options
        );
    }

    /** Export métier — dataset complet filtré (hors pagination UI). */
    export(
        filter: RejectReportStatesFilterContract,
        options?: FetchOptions
    ): Observable<RejectReportStatesEntity[]> {
        return this.useCase.export(filter, options);
    }
}
