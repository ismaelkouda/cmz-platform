import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { BYPASS_CACHE, REPORT_API_URL } from '@cmz/core';
import { buildHttpParams } from '@cmz/shared-data';
import { FetchOptions } from '@cmz/shared-domain';
import { DownloadReportStatesResponseDto } from '../dtos/download-report-states-response-api.dto';
import { DownloadReportStatesFilterApiDto } from '../dtos/download-report-states-filter-api.dto';
import { REPORT_STATES_ENDPOINTS } from '../endpoints/report-states.endpoints';

@Service()
export class DownloadReportStatesApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = inject(REPORT_API_URL);

    execute(
        filter: DownloadReportStatesFilterApiDto,
        page: string,
        options?: FetchOptions
    ): Observable<DownloadReportStatesResponseDto> {
        const url = `${this.baseUrl}${REPORT_STATES_ENDPOINTS.DOWNLOAD}`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        const params = buildHttpParams(filter, { arrayFormat: 'comma' }).set(
            'page',
            page
        );

        return this.http.get<DownloadReportStatesResponseDto>(url, {
            context,
            params,
        });
    }

    /** Export — même filtre que la liste, sans paramètre `page`. */
    export(
        filter: DownloadReportStatesFilterApiDto,
        options?: FetchOptions
    ): Observable<DownloadReportStatesResponseDto> {
        const url = `${this.baseUrl}${REPORT_STATES_ENDPOINTS.DOWNLOAD}`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        const params = buildHttpParams(filter, { arrayFormat: 'comma' });

        return this.http.get<DownloadReportStatesResponseDto>(url, {
            context,
            params,
        });
    }
}
