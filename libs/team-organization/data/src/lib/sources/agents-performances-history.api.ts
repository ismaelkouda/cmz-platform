import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { AUTH_API_URL, BYPASS_CACHE } from '@cmz/core';
import { buildHttpParams } from '@cmz/shared-data';
import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { TEAM_ORGANIZATION_ENDPOINTS } from '../endpoints/team-organization.endpoints';
import { AgentsPerformancesHistoryFilterApiDto } from '../dtos/agents-performances-history-filter-api.dto';
import { AgentsPerformancesHistoryResponseApiDto } from '../dtos/agents-performances-history-response-api.dto';

@Service()
export class AgentsPerformancesHistoryApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = inject(AUTH_API_URL);

    execute(
        filter: AgentsPerformancesHistoryFilterApiDto,
        page: string,
        options?: FetchOptions
    ): Observable<AgentsPerformancesHistoryResponseApiDto> {
        const url = `${this.baseUrl}${TEAM_ORGANIZATION_ENDPOINTS.AGENTS_PERFORMANCES}/${filter.uniq_id}?page=${page}`;
        const params = buildHttpParams(filter);
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<AgentsPerformancesHistoryResponseApiDto>(url, {
            params,
            context,
        });
    }
}
