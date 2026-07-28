import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PageQuery, PaginatedResourceFacade } from '@cmz/shared-application';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import {
    ReportStateItemEntity,
    ReportStateSection,
} from '@cmz/report-states-domain';
import { ReportStatesUseCase } from '../use-cases/report-states.use-case';

@Injectable({ providedIn: 'root' })
export class EvaluateFacade extends PaginatedResourceFacade<
    ReportStateItemEntity,
    FetchOptions
> {
    private readonly useCase = inject(ReportStatesUseCase);

    protected stream(
        params: PageQuery<FetchOptions>
    ): Observable<PageResult<ReportStateItemEntity>> {
        return this.useCase.execute(
            ReportStateSection.EVALUATE,
            params.page,
            params.options
        );
    }
}
