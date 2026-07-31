import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { BYPASS_CACHE, REPORT_API_URL } from '@cmz/core';
import { buildHttpParams } from '@cmz/shared-data';
import { FetchOptions } from '@cmz/shared-domain';
import { TasksRequestsResponseDto } from '../dtos/tasks-requests-response-api.dto';
import { TasksRequestsFilterApiDto } from '../dtos/tasks-requests-filter-api.dto';
import { REQUESTS_ENDPOINTS } from '../endpoints/requests.endpoints';

@Service()
export class TasksRequestsApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = inject(REPORT_API_URL);

    execute(
        filter: TasksRequestsFilterApiDto,
        page: string,
        options?: FetchOptions
    ): Observable<TasksRequestsResponseDto> {
        const url = `${this.baseUrl}${REQUESTS_ENDPOINTS.TASKS}`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        const params = buildHttpParams(filter, { arrayFormat: 'comma' }).set(
            'page',
            page
        );

        return this.http.get<TasksRequestsResponseDto>(url, {
            context,
            params,
        });
    }

    export(
        filter: TasksRequestsFilterApiDto,
        options?: FetchOptions
    ): Observable<TasksRequestsResponseDto> {
        const url = `${this.baseUrl}${REQUESTS_ENDPOINTS.TASKS_EXPORT}`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        const params = buildHttpParams(filter, { arrayFormat: 'comma' });

        return this.http.get<TasksRequestsResponseDto>(url, {
            context,
            params,
        });
    }
}
