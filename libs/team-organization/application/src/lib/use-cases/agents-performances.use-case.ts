import { inject, Service } from '@angular/core';
import { defer, Observable } from 'rxjs';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import {
    AgentsPerformancesEntity,
    AgentsPerformancesFilterContract,
    AgentsPerformancesRepository,
    agentsPerformancesFilterEntity,
    agentsPerformancesFilterVo,
} from '@cmz/team-organization-domain';

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginUseCase` (libs/authentication/application/src/lib/use-cases/login.use-case.ts). */
@Service({ autoProvided: false })
export class AgentsPerformancesUseCase {
    private readonly repository = inject(AgentsPerformancesRepository);

    execute(
        contract: AgentsPerformancesFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<AgentsPerformancesEntity>> {
        return defer(() =>
            this.repository.execute(
                agentsPerformancesFilterEntity(
                    agentsPerformancesFilterVo(contract)
                ),
                page,
                options
            )
        );
    }
}
