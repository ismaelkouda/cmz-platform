import { HttpClient, HttpContext } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { REPORT_API_URL, BYPASS_CACHE } from '@cmz/core';
import { buildHttpParams } from '@cmz/shared-data';
import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { DASHBOARD_ENDPOINTS } from '../endpoints/dashboard.endpoints';
import { DashboardFilterApiDto } from '../dtos/dashboard-filter-api.dto';
import { DashboardResponseApiDto } from '../dtos/dashboard-response-api.dto';

@Service()
export class DashboardApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(REPORT_API_URL);

    execute(
        dto: DashboardFilterApiDto,
        options?: FetchOptions
    ): Observable<DashboardResponseApiDto> {
        const url = `${this.baseUrl}${DASHBOARD_ENDPOINTS.STATISTICS}`;
        const params = buildHttpParams(dto);
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<DashboardResponseApiDto>(url, {
            params,
            context,
        });
    }
}
