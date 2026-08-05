import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { AUTH_API_URL, BYPASS_CACHE } from '@cmz/core';
import { buildHttpParams } from '@cmz/shared-data';
import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { TEAM_ORGANIZATION_ENDPOINTS } from '../endpoints/team-organization.endpoints';
import { AgentsPerformancesFilterApiDto } from '../dtos/agents-performances-filter-api.dto';
import { AgentsPerformancesResponseApiDto } from '../dtos/agents-performances-response-api.dto';

@Service()
export class AgentsPerformancesApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = inject(AUTH_API_URL);

    execute(
        filter: AgentsPerformancesFilterApiDto,
        page: string,
        options?: FetchOptions
    ): Observable<AgentsPerformancesResponseApiDto> {
        const url = `${this.baseUrl}${TEAM_ORGANIZATION_ENDPOINTS.AGENTS_PERFORMANCES}?page=${page}`;
        const params = buildHttpParams(filter);
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<AgentsPerformancesResponseApiDto>(url, {
            params,
            context,
        });
    }
}
