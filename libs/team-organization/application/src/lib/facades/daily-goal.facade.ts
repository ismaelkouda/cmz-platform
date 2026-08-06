import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { PageQuery, PaginatedResourceFacade } from '@cmz/shared-application';
import { PageResult } from '@cmz/shared-domain';
import {
    DailyGoalEntity,
    DailyGoalFilterContract,
} from '@cmz/team-organization-domain';
import { DailyGoalUseCase } from '../use-cases/daily-goal.use-case';

@Service()
export class DailyGoalFacade extends PaginatedResourceFacade<
    DailyGoalEntity,
    DailyGoalFilterContract
> {
    private readonly useCase = inject(DailyGoalUseCase);

    protected stream(
        params: PageQuery<DailyGoalFilterContract>
    ): Observable<PageResult<DailyGoalEntity>> {
        return this.useCase.execute(
            params.filter ?? {},
            params.page,
            params.options
        );
    }
}
