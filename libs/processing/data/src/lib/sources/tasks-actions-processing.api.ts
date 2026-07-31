import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { BYPASS_CACHE, REPORT_API_URL } from '@cmz/core';
import { buildHttpPayload, SimpleResponseDto } from '@cmz/shared-data';
import { FetchOptions } from '@cmz/shared-domain';
import {
    TasksActionsCreateApiDto,
    TasksActionsDeleteApiDto,
    TasksActionsFilterApiDto,
    TasksActionsResponseDto,
    TasksActionsUpdateApiDto,
} from '../dtos/tasks-actions-processing-api.dto';
import { PROCESSING_ENDPOINTS } from '../endpoints/processing.endpoints';

/** Source HTTP actions de traitement — legacy `TasksActionsProcessingApi`. */
@Service()
export class TasksActionsProcessingApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = inject(REPORT_API_URL);

    execute(
        dto: TasksActionsFilterApiDto,
        page: string,
        options?: FetchOptions
    ): Observable<TasksActionsResponseDto> {
        const url = `${this.baseUrl}${dto.report_uniq_id}${PROCESSING_ENDPOINTS.PROCESSING}?page=${page}`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<TasksActionsResponseDto>(url, { context });
    }

    create(
        apiDto: TasksActionsCreateApiDto
    ): Observable<SimpleResponseDto<void>> {
        const url = `${this.baseUrl}${PROCESSING_ENDPOINTS.PROCESSING}/store`;
        const payload = buildHttpPayload(apiDto, []);
        return this.http.post<SimpleResponseDto<void>>(url, payload);
    }

    update(
        apiDto: TasksActionsUpdateApiDto
    ): Observable<SimpleResponseDto<void>> {
        const url = `${this.baseUrl}${PROCESSING_ENDPOINTS.PROCESSING}/${apiDto.uniq_id}/update`;
        const payload = buildHttpPayload(apiDto, ['uniq_id']);
        return this.http.post<SimpleResponseDto<void>>(url, payload);
    }

    delete(
        apiDto: TasksActionsDeleteApiDto
    ): Observable<SimpleResponseDto<void>> {
        const url = `${this.baseUrl}${PROCESSING_ENDPOINTS.PROCESSING}/${apiDto.uniq_id}/delete`;
        return this.http.delete<SimpleResponseDto<void>>(url);
    }
}
