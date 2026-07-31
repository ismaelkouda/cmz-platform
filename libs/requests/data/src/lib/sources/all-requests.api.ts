import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { BYPASS_CACHE, REPORT_API_URL } from '@cmz/core';
import { buildHttpParams } from '@cmz/shared-data';
import { FetchOptions } from '@cmz/shared-domain';
import { AllRequestsResponseDto } from '../dtos/all-requests-response-api.dto';
import { AllRequestsFilterApiDto } from '../dtos/all-requests-filter-api.dto';
import { REQUESTS_ENDPOINTS } from '../endpoints/requests.endpoints';

@Service()
export class AllRequestsApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = inject(REPORT_API_URL);

    execute(
        filter: AllRequestsFilterApiDto,
        page: string,
        options?: FetchOptions
    ): Observable<AllRequestsResponseDto> {
        const url = `${this.baseUrl}${REQUESTS_ENDPOINTS.ALL}`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        const params = buildHttpParams(filter, { arrayFormat: 'comma' }).set(
            'page',
            page
        );

        return this.http.get<AllRequestsResponseDto>(url, { context, params });
    }

    export(
        filter: AllRequestsFilterApiDto,
        options?: FetchOptions
    ): Observable<AllRequestsResponseDto> {
        const url = `${this.baseUrl}${REQUESTS_ENDPOINTS.ALL_EXPORT}`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        const params = buildHttpParams(filter, { arrayFormat: 'comma' });

        return this.http.get<AllRequestsResponseDto>(url, { context, params });
    }
}
