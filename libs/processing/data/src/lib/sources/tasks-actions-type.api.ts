import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { BYPASS_CACHE, REPORT_API_URL } from '@cmz/core';
import { FetchOptions } from '@cmz/shared-domain';
import {
    TasksActionsTypeFilterApiDto,
    TasksActionsTypeResponseDto,
} from '../dtos/tasks-actions-api.dto';
import { PROCESSING_ENDPOINTS } from '../endpoints/processing.endpoints';

@Service()
export class TasksActionsTypeApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = inject(REPORT_API_URL);

    readAll(
        dto: TasksActionsTypeFilterApiDto,
        options?: FetchOptions
    ): Observable<TasksActionsTypeResponseDto> {
        const url = `${this.baseUrl}${PROCESSING_ENDPOINTS.PROCESSING}/${dto.id}/report-types`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<TasksActionsTypeResponseDto>(url, { context });
    }
}
