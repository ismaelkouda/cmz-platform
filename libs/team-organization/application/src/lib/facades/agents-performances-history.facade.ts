import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { PageQuery, PaginatedResourceFacade } from '@cmz/shared-application';
import { PageResult } from '@cmz/shared-domain';
import {
    AgentsPerformancesHistoryEntity,
    AgentsPerformancesHistoryFilterContract,
} from '@cmz/team-organization-domain';
import { AgentsPerformancesHistoryUseCase } from '../use-cases/agents-performances-history.use-case';

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginFacade` (libs/authentication/application/src/lib/facades/login.facade.ts). */
@Service({ autoProvided: false })
export class AgentsPerformancesHistoryFacade extends PaginatedResourceFacade<
    AgentsPerformancesHistoryEntity,
    AgentsPerformancesHistoryFilterContract
> {
    private readonly useCase = inject(AgentsPerformancesHistoryUseCase);

    protected stream(
        params: PageQuery<AgentsPerformancesHistoryFilterContract>
    ): Observable<PageResult<AgentsPerformancesHistoryEntity>> {
        return this.useCase.execute(
            params.filter ?? {},
            params.page,
            params.options
        );
    }
}
