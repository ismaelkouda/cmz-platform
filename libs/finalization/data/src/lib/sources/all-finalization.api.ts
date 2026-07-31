import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { BYPASS_CACHE, REPORT_API_URL } from '@cmz/core';
import { buildHttpParams } from '@cmz/shared-data';
import { FetchOptions } from '@cmz/shared-domain';
import { AllFinalizationResponseDto } from '../dtos/all-finalization-response-api.dto';
import { AllFinalizationFilterApiDto } from '../dtos/all-finalization-filter-api.dto';
import { FINALIZATION_ENDPOINTS } from '../endpoints/finalization.endpoints';

@Service()
export class AllFinalizationApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = inject(REPORT_API_URL);

    execute(
        filter: AllFinalizationFilterApiDto,
        page: string,
        options?: FetchOptions
    ): Observable<AllFinalizationResponseDto> {
        const url = `${this.baseUrl}${FINALIZATION_ENDPOINTS.ALL}`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        const params = buildHttpParams(filter, { arrayFormat: 'comma' }).set(
            'page',
            page
        );

        return this.http.get<AllFinalizationResponseDto>(url, {
            context,
            params,
        });
    }

    export(
        filter: AllFinalizationFilterApiDto,
        options?: FetchOptions
    ): Observable<AllFinalizationResponseDto> {
        const url = `${this.baseUrl}${FINALIZATION_ENDPOINTS.ALL_EXPORT}`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        const params = buildHttpParams(filter, { arrayFormat: 'comma' });

        return this.http.get<AllFinalizationResponseDto>(url, {
            context,
            params,
        });
    }
}
