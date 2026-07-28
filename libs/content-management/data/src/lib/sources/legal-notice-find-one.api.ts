import { HttpClient, HttpContext } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { BYPASS_CACHE, SETTINGS_API_URL } from '@cmz/core';
import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { CONTENT_MANAGEMENT_ENDPOINTS } from '../endpoints/content-management.endpoints';
import { LegalNoticeFindOneFilterApiDto } from '../dtos/legal-notice-find-one-filter-api.dto';
import { LegalNoticeFindOneResponseApiDto } from '../dtos/legal-notice-find-one-response-api.dto';

@Service()
export class LegalNoticeFindOneApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(SETTINGS_API_URL);

    execute(
        dto?: LegalNoticeFindOneFilterApiDto,
        options?: FetchOptions
    ): Observable<LegalNoticeFindOneResponseApiDto> {
        const path = dto?.id ? `/${dto.id}` : '';
        const url = `${this.baseUrl}${CONTENT_MANAGEMENT_ENDPOINTS.LEGAL_NOTICE}${path}`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<LegalNoticeFindOneResponseApiDto>(url, {
            context,
        });
    }
}
