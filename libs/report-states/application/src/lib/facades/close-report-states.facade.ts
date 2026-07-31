import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { PageQuery, PaginatedResourceFacade } from '@cmz/shared-application';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import {
    CloseReportStatesFilterContract,
    CloseReportStatesEntity,
} from '@cmz/report-states-domain';
import { CloseReportStatesUseCase } from '../use-cases/close-report-states.use-case';

@Service()
export class CloseReportStatesFacade extends PaginatedResourceFacade<
    CloseReportStatesEntity,
    CloseReportStatesFilterContract
> {
    private readonly useCase = inject(CloseReportStatesUseCase);

    protected stream(
        params: PageQuery<CloseReportStatesFilterContract>
    ): Observable<PageResult<CloseReportStatesEntity>> {
        return this.useCase.execute(
            params.filter ?? {},
            params.page,
            params.options
        );
    }

    export(
        filter: CloseReportStatesFilterContract,
        options?: FetchOptions
    ): Observable<CloseReportStatesEntity[]> {
        return this.useCase.export(filter, options);
    }
}
