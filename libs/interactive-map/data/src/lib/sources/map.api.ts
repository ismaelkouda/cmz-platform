import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { BYPASS_CACHE, SETTINGS_API_URL } from '@cmz/core';
import { FetchOptions } from '@cmz/shared-domain';
import { INTERACTIVE_MAP_ENDPOINTS } from '../endpoints/interactive-map.endpoints';
import { MapResponseDto } from '../dtos/map-response.dto';

@Service()
export class MapApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = inject(SETTINGS_API_URL);

    getMap(options?: FetchOptions): Observable<MapResponseDto> {
        const url = `${this.baseUrl}/${INTERACTIVE_MAP_ENDPOINTS.MAP}`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<MapResponseDto>(url, { context });
    }
}
