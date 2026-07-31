import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { BYPASS_CACHE, REPORT_API_URL } from '@cmz/core';
import { buildHttpParams } from '@cmz/shared-data';
import { FetchOptions } from '@cmz/shared-domain';
import { EvaluateReportStatesResponseDto } from '../dtos/evaluate-report-states-response-api.dto';
import { EvaluateReportStatesFilterApiDto } from '../dtos/evaluate-report-states-filter-api.dto';
import { REPORT_STATES_ENDPOINTS } from '../endpoints/report-states.endpoints';

@Service()
export class EvaluateReportStatesApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = inject(REPORT_API_URL);

    execute(
        filter: EvaluateReportStatesFilterApiDto,
        page: string,
        options?: FetchOptions
    ): Observable<EvaluateReportStatesResponseDto> {
        const url = `${this.baseUrl}${REPORT_STATES_ENDPOINTS.EVALUATE}`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        const params = buildHttpParams(filter, { arrayFormat: 'comma' }).set(
            'page',
            page
        );

        return this.http.get<EvaluateReportStatesResponseDto>(url, {
            context,
            params,
        });
    }

    export(
        filter: EvaluateReportStatesFilterApiDto,
        options?: FetchOptions
    ): Observable<EvaluateReportStatesResponseDto> {
        const url = `${this.baseUrl}${REPORT_STATES_ENDPOINTS.EVALUATE_EXPORT}`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        const params = buildHttpParams(filter, { arrayFormat: 'comma' });

        return this.http.get<EvaluateReportStatesResponseDto>(url, {
            context,
            params,
        });
    }
}
