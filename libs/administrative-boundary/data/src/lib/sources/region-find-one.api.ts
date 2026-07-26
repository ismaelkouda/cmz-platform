import { HttpClient, HttpContext } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { BYPASS_CACHE, SETTINGS_API_URL } from '@cmz/core';
import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { ADMINISTRATIVE_BOUNDARY_ENDPOINTS } from '../endpoints/administrative-boundary.endpoints';
import { RegionFindOneFilterApiDto } from '../dtos/region-find-one-filter-api.dto';
import { RegionFindOneResponseApiDto } from '../dtos/region-find-one-response-api.dto';

@Service()
export class RegionFindOneApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(SETTINGS_API_URL);

    execute(
        dto: RegionFindOneFilterApiDto,
        options?: FetchOptions
    ): Observable<RegionFindOneResponseApiDto> {
        const url = `${this.baseUrl}${ADMINISTRATIVE_BOUNDARY_ENDPOINTS.REGION}/${dto.uniq_id}`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<RegionFindOneResponseApiDto>(url, { context });
    }
}
