import { Service, inject } from '@angular/core';
import {
    AgentsPerformancesHistoryEntity,
    AgentsPerformancesHistoryFilterContract,
    AgentsPerformancesHistoryRepository,
} from '@cmz/team-organization-domain';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import { map, Observable } from 'rxjs';
import { agentsPerformancesHistoryFilterMapper } from '../mappers/agents-performances-history-filter.mapper';
import { AgentsPerformancesHistoryMapper } from '../mappers/agents-performances-history.mapper';
import { AgentsPerformancesHistoryApi } from '../sources/agents-performances-history.api';

@Service()
export class AgentsPerformancesHistoryRepositoryImpl implements AgentsPerformancesHistoryRepository {
    private readonly api = inject(AgentsPerformancesHistoryApi);
    private readonly mapper = inject(AgentsPerformancesHistoryMapper);

    execute(
        filter: AgentsPerformancesHistoryFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<AgentsPerformancesHistoryEntity>> {
        return this.api
            .execute(
                agentsPerformancesHistoryFilterMapper(filter),
                page,
                options
            )
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
