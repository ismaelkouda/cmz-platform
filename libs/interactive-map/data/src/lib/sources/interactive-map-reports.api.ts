import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { BYPASS_CACHE, REPORT_API_URL } from '@cmz/core';
import { FetchOptions } from '@cmz/shared-domain';
import { INTERACTIVE_MAP_ENDPOINTS } from '../endpoints/interactive-map.endpoints';
import { InteractiveMapReportsResponseApiDto } from '../dtos/interactive-map-report-api.dto';

/** Enveloppe API standard `{ error, message, data }`. */
export type InteractiveMapReportsApiResponse = {
    error: boolean;
    message: string;
    data: InteractiveMapReportsResponseApiDto;
};

@Service()
export class InteractiveMapReportsApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = inject(REPORT_API_URL);

    getReports(
        options?: FetchOptions
    ): Observable<InteractiveMapReportsApiResponse> {
        const url = `${this.baseUrl}${INTERACTIVE_MAP_ENDPOINTS.REPORTS}`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<InteractiveMapReportsApiResponse>(url, {
            context,
            params: { per_page: '500', page: '1' },
        });
    }
}
