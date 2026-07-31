import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { BYPASS_CACHE, REPORT_API_URL } from '@cmz/core';
import { buildHttpParams } from '@cmz/shared-data';
import { FetchOptions } from '@cmz/shared-domain';
import { TasksProcessingResponseDto } from '../dtos/tasks-processing-response-api.dto';
import { TasksProcessingFilterApiDto } from '../dtos/tasks-processing-filter-api.dto';
import { PROCESSING_ENDPOINTS } from '../endpoints/processing.endpoints';

@Service()
export class TasksProcessingApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = inject(REPORT_API_URL);

    execute(
        filter: TasksProcessingFilterApiDto,
        page: string,
        options?: FetchOptions
    ): Observable<TasksProcessingResponseDto> {
        const url = `${this.baseUrl}${PROCESSING_ENDPOINTS.TASKS}`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        const params = buildHttpParams(filter, { arrayFormat: 'comma' }).set(
            'page',
            page
        );

        return this.http.get<TasksProcessingResponseDto>(url, {
            context,
            params,
        });
    }

    export(
        filter: TasksProcessingFilterApiDto,
        options?: FetchOptions
    ): Observable<TasksProcessingResponseDto> {
        const url = `${this.baseUrl}${PROCESSING_ENDPOINTS.TASKS_EXPORT}`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        const params = buildHttpParams(filter, { arrayFormat: 'comma' });

        return this.http.get<TasksProcessingResponseDto>(url, {
            context,
            params,
        });
    }
}
