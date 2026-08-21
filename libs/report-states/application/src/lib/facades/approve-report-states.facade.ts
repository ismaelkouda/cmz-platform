import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { FetchOptions } from '@cmz/shared-domain';
import { PageQuery, PaginatedResourceFacade } from '@cmz/shared-application';
import { PageResult } from '@cmz/shared-domain';
import {
    ApproveReportStatesEntity,
    ApproveReportStatesFilterContract,
} from '@cmz/report-states-domain';
import { ApproveReportStatesUseCase } from '../use-cases/approve-report-states.use-case';

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginFacade` (libs/authentication/application/src/lib/facades/login.facade.ts). */
@Service({ autoProvided: false })
export class ApproveReportStatesFacade extends PaginatedResourceFacade<
    ApproveReportStatesEntity,
    ApproveReportStatesFilterContract
> {
    private readonly useCase = inject(ApproveReportStatesUseCase);

    protected stream(
        params: PageQuery<ApproveReportStatesFilterContract>
    ): Observable<PageResult<ApproveReportStatesEntity>> {
        return this.useCase.execute(
            params.filter ?? {},
            params.page,
            params.options
        );
    }

    /** Export métier — dataset complet filtré (hors pagination UI). */
    export(
        filter: ApproveReportStatesFilterContract,
        options?: FetchOptions
    ): Observable<ApproveReportStatesEntity[]> {
        return this.useCase.export(filter, options);
    }
}
