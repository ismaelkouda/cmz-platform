import { HttpClient, HttpContext } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { AUTH_API_URL, BYPASS_CACHE } from '@cmz/core';
import { buildHttpParams } from '@cmz/shared-data';
import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { SETTINGS_SECURITY_ENDPOINTS } from '../endpoints/settings-security.endpoints';
import { AccessLogsFilterApiDto } from '../dtos/access-logs-filter-api.dto';
import { AccessLogsResponseApiDto } from '../dtos/access-logs-response-api.dto';

/**
 * Seule source de ce module sur `AUTH_API_URL` (pas `SETTINGS_API_URL`) —
 * confirmé dans le source (`access-logs.api.ts` injecte `AUTH_API_URL`).
 */
@Service()
export class AccessLogsApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(AUTH_API_URL);

    readAll(
        dto: AccessLogsFilterApiDto,
        page: string,
        options?: FetchOptions
    ): Observable<AccessLogsResponseApiDto> {
        const url = `${this.baseUrl}${SETTINGS_SECURITY_ENDPOINTS.ACCESS_LOGS}?page=${page}`;
        const params = buildHttpParams(dto);
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<AccessLogsResponseApiDto>(url, {
            params,
            context,
        });
    }
}
