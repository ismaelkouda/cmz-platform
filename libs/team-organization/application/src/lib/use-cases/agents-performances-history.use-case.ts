import { inject, Service } from '@angular/core';
import { defer, Observable } from 'rxjs';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import {
    AgentsPerformancesHistoryEntity,
    AgentsPerformancesHistoryFilterContract,
    AgentsPerformancesHistoryRepository,
    agentsPerformancesHistoryFilterEntity,
    agentsPerformancesHistoryFilterVo,
} from '@cmz/team-organization-domain';

@Service()
export class AgentsPerformancesHistoryUseCase {
    private readonly repository = inject(AgentsPerformancesHistoryRepository);

    execute(
        contract: AgentsPerformancesHistoryFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<AgentsPerformancesHistoryEntity>> {
        return defer(() =>
            this.repository.execute(
                agentsPerformancesHistoryFilterEntity(
                    agentsPerformancesHistoryFilterVo(contract)
                ),
                page,
                options
            )
        );
    }
}
