import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { BYPASS_CACHE, REPORT_API_URL } from '@cmz/core';
import { buildHttpParams } from '@cmz/shared-data';
import { FetchOptions } from '@cmz/shared-domain';
import { QueuesRequestsResponseDto } from '../dtos/queues-requests-response-api.dto';
import { QueuesRequestsFilterApiDto } from '../dtos/queues-requests-filter-api.dto';
import { REQUESTS_ENDPOINTS } from '../endpoints/requests.endpoints';

@Service()
export class QueuesRequestsApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = inject(REPORT_API_URL);

    execute(
        filter: QueuesRequestsFilterApiDto,
        page: string,
        options?: FetchOptions
    ): Observable<QueuesRequestsResponseDto> {
        const url = `${this.baseUrl}${REQUESTS_ENDPOINTS.QUEUES}`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        const params = buildHttpParams(filter, { arrayFormat: 'comma' }).set(
            'page',
            page
        );

        return this.http.get<QueuesRequestsResponseDto>(url, {
            context,
            params,
        });
    }

    /** Export — même filtre que la liste, sans paramètre `page`. */
    export(
        filter: QueuesRequestsFilterApiDto,
        options?: FetchOptions
    ): Observable<QueuesRequestsResponseDto> {
        const url = `${this.baseUrl}${REQUESTS_ENDPOINTS.QUEUES_EXPORT}`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        const params = buildHttpParams(filter, { arrayFormat: 'comma' });

        return this.http.get<QueuesRequestsResponseDto>(url, {
            context,
            params,
        });
    }
}
