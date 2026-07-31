import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { BYPASS_CACHE, REPORT_API_URL } from '@cmz/core';
import { buildHttpParams } from '@cmz/shared-data';
import { FetchOptions } from '@cmz/shared-domain';
import { QueuesProcessingResponseDto } from '../dtos/queues-processing-response-api.dto';
import { QueuesProcessingFilterApiDto } from '../dtos/queues-processing-filter-api.dto';
import { PROCESSING_ENDPOINTS } from '../endpoints/processing.endpoints';

@Service()
export class QueuesProcessingApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = inject(REPORT_API_URL);

    execute(
        filter: QueuesProcessingFilterApiDto,
        page: string,
        options?: FetchOptions
    ): Observable<QueuesProcessingResponseDto> {
        const url = `${this.baseUrl}${PROCESSING_ENDPOINTS.QUEUES}`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        const params = buildHttpParams(filter, { arrayFormat: 'comma' }).set(
            'page',
            page
        );

        return this.http.get<QueuesProcessingResponseDto>(url, {
            context,
            params,
        });
    }

    export(
        filter: QueuesProcessingFilterApiDto,
        options?: FetchOptions
    ): Observable<QueuesProcessingResponseDto> {
        const url = `${this.baseUrl}${PROCESSING_ENDPOINTS.QUEUES_EXPORT}`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        const params = buildHttpParams(filter, { arrayFormat: 'comma' });

        return this.http.get<QueuesProcessingResponseDto>(url, {
            context,
            params,
        });
    }
}
