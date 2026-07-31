import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { BYPASS_CACHE, REPORT_API_URL } from '@cmz/core';
import { buildHttpParams } from '@cmz/shared-data';
import { FetchOptions } from '@cmz/shared-domain';
import { RejectReportStatesResponseDto } from '../dtos/reject-report-states-response-api.dto';
import { RejectReportStatesFilterApiDto } from '../dtos/reject-report-states-filter-api.dto';
import { REPORT_STATES_ENDPOINTS } from '../endpoints/report-states.endpoints';

@Service()
export class RejectReportStatesApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = inject(REPORT_API_URL);

    execute(
        filter: RejectReportStatesFilterApiDto,
        page: string,
        options?: FetchOptions
    ): Observable<RejectReportStatesResponseDto> {
        const url = `${this.baseUrl}${REPORT_STATES_ENDPOINTS.REJECT}`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        const params = buildHttpParams(filter, { arrayFormat: 'comma' }).set(
            'page',
            page
        );

        return this.http.get<RejectReportStatesResponseDto>(url, {
            context,
            params,
        });
    }

    /** Export — même filtre que la liste, sans paramètre `page`. */
    export(
        filter: RejectReportStatesFilterApiDto,
        options?: FetchOptions
    ): Observable<RejectReportStatesResponseDto> {
        const url = `${this.baseUrl}${REPORT_STATES_ENDPOINTS.REJECT_EXPORT}`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        const params = buildHttpParams(filter, { arrayFormat: 'comma' });

        return this.http.get<RejectReportStatesResponseDto>(url, {
            context,
            params,
        });
    }
}
