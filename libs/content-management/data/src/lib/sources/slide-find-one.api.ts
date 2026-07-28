import { HttpClient, HttpContext } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { BYPASS_CACHE, SETTINGS_API_URL } from '@cmz/core';
import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { CONTENT_MANAGEMENT_ENDPOINTS } from '../endpoints/content-management.endpoints';
import { SlideFindOneFilterApiDto } from '../dtos/slide-find-one-filter-api.dto';
import { SlideFindOneResponseApiDto } from '../dtos/slide-find-one-response-api.dto';

@Service()
export class SlideFindOneApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(SETTINGS_API_URL);

    execute(
        dto?: SlideFindOneFilterApiDto,
        options?: FetchOptions
    ): Observable<SlideFindOneResponseApiDto> {
        const path = dto?.id ? `/${dto.id}` : '';
        const url = `${this.baseUrl}${CONTENT_MANAGEMENT_ENDPOINTS.SLIDE}${path}`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<SlideFindOneResponseApiDto>(url, { context });
    }
}
