import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { BYPASS_CACHE, REPORT_API_URL } from '@cmz/core';
import { buildHttpParams } from '@cmz/shared-data';
import { FetchOptions } from '@cmz/shared-domain';
import { QueuesFinalizationResponseDto } from '../dtos/queues-finalization-response-api.dto';
import { QueuesFinalizationFilterApiDto } from '../dtos/queues-finalization-filter-api.dto';
import { FINALIZATION_ENDPOINTS } from '../endpoints/finalization.endpoints';

@Service()
export class QueuesFinalizationApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = inject(REPORT_API_URL);

    execute(
        filter: QueuesFinalizationFilterApiDto,
        page: string,
        options?: FetchOptions
    ): Observable<QueuesFinalizationResponseDto> {
        const url = `${this.baseUrl}${FINALIZATION_ENDPOINTS.QUEUES}`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        const params = buildHttpParams(filter, { arrayFormat: 'comma' }).set(
            'page',
            page
        );

        return this.http.get<QueuesFinalizationResponseDto>(url, {
            context,
            params,
        });
    }

    /** Export — même filtre que la liste, sans paramètre `page`. */
    export(
        filter: QueuesFinalizationFilterApiDto,
        options?: FetchOptions
    ): Observable<QueuesFinalizationResponseDto> {
        const url = `${this.baseUrl}${FINALIZATION_ENDPOINTS.QUEUES_EXPORT}`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        const params = buildHttpParams(filter, { arrayFormat: 'comma' });

        return this.http.get<QueuesFinalizationResponseDto>(url, {
            context,
            params,
        });
    }
}
