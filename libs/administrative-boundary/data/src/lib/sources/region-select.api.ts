import { HttpClient, HttpContext } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { BYPASS_CACHE, SETTINGS_API_URL } from '@cmz/core';
import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { ADMINISTRATIVE_BOUNDARY_ENDPOINTS } from '../endpoints/administrative-boundary.endpoints';
import { RegionSelectResponseApiDto } from '../dtos/region-select-response-api.dto';

@Service()
export class RegionSelectApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(SETTINGS_API_URL);

    readAll(options?: FetchOptions): Observable<RegionSelectResponseApiDto> {
        const url = `${this.baseUrl}${ADMINISTRATIVE_BOUNDARY_ENDPOINTS.REGION}/selected-field`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<RegionSelectResponseApiDto>(url, { context });
    }
}
