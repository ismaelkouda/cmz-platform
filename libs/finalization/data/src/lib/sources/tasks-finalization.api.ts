import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { BYPASS_CACHE, REPORT_API_URL } from '@cmz/core';
import { buildHttpParams } from '@cmz/shared-data';
import { FetchOptions } from '@cmz/shared-domain';
import { TasksFinalizationResponseDto } from '../dtos/tasks-finalization-response-api.dto';
import { TasksFinalizationFilterApiDto } from '../dtos/tasks-finalization-filter-api.dto';
import { FINALIZATION_ENDPOINTS } from '../endpoints/finalization.endpoints';

@Service()
export class TasksFinalizationApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = inject(REPORT_API_URL);

    execute(
        filter: TasksFinalizationFilterApiDto,
        page: string,
        options?: FetchOptions
    ): Observable<TasksFinalizationResponseDto> {
        const url = `${this.baseUrl}${FINALIZATION_ENDPOINTS.TASKS}`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        const params = buildHttpParams(filter, { arrayFormat: 'comma' }).set(
            'page',
            page
        );

        return this.http.get<TasksFinalizationResponseDto>(url, {
            context,
            params,
        });
    }

    export(
        filter: TasksFinalizationFilterApiDto,
        options?: FetchOptions
    ): Observable<TasksFinalizationResponseDto> {
        const url = `${this.baseUrl}${FINALIZATION_ENDPOINTS.TASKS_EXPORT}`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        const params = buildHttpParams(filter, { arrayFormat: 'comma' });

        return this.http.get<TasksFinalizationResponseDto>(url, {
            context,
            params,
        });
    }
}
