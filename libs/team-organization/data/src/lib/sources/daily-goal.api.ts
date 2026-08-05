import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { AUTH_API_URL, BYPASS_CACHE } from '@cmz/core';
import { buildHttpParams } from '@cmz/shared-data';
import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { TEAM_ORGANIZATION_ENDPOINTS } from '../endpoints/team-organization.endpoints';
import { DailyGoalFilterApiDto } from '../dtos/daily-goal-filter-api.dto';
import { DailyGoalResponseApiDto } from '../dtos/daily-goal-response-api.dto';

@Service()
export class DailyGoalApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = inject(AUTH_API_URL);

    execute(
        filter: DailyGoalFilterApiDto,
        page: string,
        options?: FetchOptions
    ): Observable<DailyGoalResponseApiDto> {
        const url = `${this.baseUrl}${TEAM_ORGANIZATION_ENDPOINTS.DAILY_GOAL}?page=${page}`;
        const params = buildHttpParams(filter);
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<DailyGoalResponseApiDto>(url, {
            params,
            context,
        });
    }
}
