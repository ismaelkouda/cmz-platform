import { Service, inject } from '@angular/core';
import {
    AgentsPerformancesEntity,
    AgentsPerformancesFilterContract,
    AgentsPerformancesRepository,
} from '@cmz/team-organization-domain';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import { map, Observable } from 'rxjs';
import { agentsPerformancesFilterMapper } from '../mappers/agents-performances-filter.mapper';
import { AgentsPerformancesMapper } from '../mappers/agents-performances.mapper';
import { AgentsPerformancesApi } from '../sources/agents-performances.api';

@Service()
export class AgentsPerformancesRepositoryImpl
    implements AgentsPerformancesRepository
{
    private readonly api = inject(AgentsPerformancesApi);
    private readonly mapper = inject(AgentsPerformancesMapper);

    execute(
        filter: AgentsPerformancesFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<AgentsPerformancesEntity>> {
        return this.api
            .execute(agentsPerformancesFilterMapper(filter), page, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
