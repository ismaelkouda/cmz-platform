import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BYPASS_CACHE, REPORT_API_URL } from '@cmz/core';
import { FetchOptions } from '@cmz/shared-domain';
import { ReportStateSection } from '@cmz/report-states-domain';
import { REPORT_STATES_ENDPOINTS } from '../endpoints/report-states.endpoints';
import { ReportStatesResponseDto } from '../dtos/report-state-item.dto';

const SECTION_ENDPOINT_MAP: Record<ReportStateSection, string> = {
    [ReportStateSection.APPROVE]: REPORT_STATES_ENDPOINTS.APPROVE,
    [ReportStateSection.EVALUATE]: REPORT_STATES_ENDPOINTS.EVALUATE,
    [ReportStateSection.CLOSE]: REPORT_STATES_ENDPOINTS.CLOSE,
    [ReportStateSection.REJECT]: REPORT_STATES_ENDPOINTS.REJECT,
    [ReportStateSection.DOWNLOAD]: REPORT_STATES_ENDPOINTS.DOWNLOAD,
};

@Injectable({ providedIn: 'root' })
export class ReportStatesApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = inject(REPORT_API_URL);

    execute(
        section: ReportStateSection,
        page = '1',
        options?: FetchOptions
    ): Observable<ReportStatesResponseDto> {
        const endpoint = SECTION_ENDPOINT_MAP[section];
        const url = `${this.baseUrl}/${endpoint}`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        const params = new HttpParams().set('page', page);

        return this.http.get<ReportStatesResponseDto>(url, { context, params });
    }
}
