import { HttpClient, HttpContext } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { BYPASS_CACHE, SETTINGS_API_URL } from '@cmz/core';
import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { COVERAGE_AREAS_ENDPOINTS } from '../endpoints/coverage-areas.endpoints';
import { SiteGroupFindOneFilterApiDto } from '../dtos/site-group-find-one-filter-api.dto';
import { SiteGroupFindOneResponseApiDto } from '../dtos/site-group-find-one-response-api.dto';

@Service()
export class SiteGroupFindOneApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(SETTINGS_API_URL);

    execute(
        dto?: SiteGroupFindOneFilterApiDto,
        options?: FetchOptions
    ): Observable<SiteGroupFindOneResponseApiDto> {
        const params = dto?.id ? `/${dto.id}` : '';
        const url = `${this.baseUrl}${COVERAGE_AREAS_ENDPOINTS.SITE_GROUP}${params}`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<SiteGroupFindOneResponseApiDto>(url, {
            context,
        });
    }
}
