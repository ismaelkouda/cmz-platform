import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { BYPASS_CACHE, REPORT_API_URL } from '@cmz/core';
import { buildHttpParams } from '@cmz/shared-data';
import { FetchOptions } from '@cmz/shared-domain';
import { AllProcessingResponseDto } from '../dtos/all-processing-response-api.dto';
import { AllProcessingFilterApiDto } from '../dtos/all-processing-filter-api.dto';
import { PROCESSING_ENDPOINTS } from '../endpoints/processing.endpoints';

@Service()
export class AllProcessingApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = inject(REPORT_API_URL);

    execute(
        filter: AllProcessingFilterApiDto,
        page: string,
        options?: FetchOptions
    ): Observable<AllProcessingResponseDto> {
        const url = `${this.baseUrl}${PROCESSING_ENDPOINTS.ALL}`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        const params = buildHttpParams(filter, { arrayFormat: 'comma' }).set(
            'page',
            page
        );

        return this.http.get<AllProcessingResponseDto>(url, {
            context,
            params,
        });
    }

    export(
        filter: AllProcessingFilterApiDto,
        options?: FetchOptions
    ): Observable<AllProcessingResponseDto> {
        const url = `${this.baseUrl}${PROCESSING_ENDPOINTS.ALL_EXPORT}`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        const params = buildHttpParams(filter, { arrayFormat: 'comma' });

        return this.http.get<AllProcessingResponseDto>(url, {
            context,
            params,
        });
    }
}
