import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { PageQuery, PaginatedResourceFacade } from '@cmz/shared-application';
import { PageResult } from '@cmz/shared-domain';
import {
    AgentsPerformancesEntity,
    AgentsPerformancesFilterContract,
} from '@cmz/team-organization-domain';
import { AgentsPerformancesUseCase } from '../use-cases/agents-performances.use-case';

@Service()
export class AgentsPerformancesFacade extends PaginatedResourceFacade<
    AgentsPerformancesEntity,
    AgentsPerformancesFilterContract
> {
    private readonly useCase = inject(AgentsPerformancesUseCase);

    protected stream(
        params: PageQuery<AgentsPerformancesFilterContract>
    ): Observable<PageResult<AgentsPerformancesEntity>> {
        return this.useCase.execute(
            params.filter ?? {},
            params.page,
            params.options
        );
    }
}
