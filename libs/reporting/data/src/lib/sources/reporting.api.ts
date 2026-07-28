import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BYPASS_CACHE, SETTINGS_API_URL } from '@cmz/core';
import { FetchOptions } from '@cmz/shared-domain';
import { ReportingVariablesResponseDto } from '../dtos/reporting-variables-response.dto';
import { REPORTING_ENDPOINTS } from '../endpoints/reporting.endpoints';

@Injectable({ providedIn: 'root' })
export class ReportingApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = inject(SETTINGS_API_URL);

    getVariables(
        options?: FetchOptions
    ): Observable<ReportingVariablesResponseDto> {
        const url = `${this.baseUrl}/${REPORTING_ENDPOINTS.VARIABLES}`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<ReportingVariablesResponseDto>(url, { context });
    }
}
