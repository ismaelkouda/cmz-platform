import { HttpClient, HttpContext } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { BYPASS_CACHE, SETTINGS_API_URL } from '@cmz/core';
import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { COVERAGE_AREAS_ENDPOINTS } from '../endpoints/coverage-areas.endpoints';
import { MobileNetworkFindOneFilterApiDto } from '../dtos/mobile-network-find-one-filter-api.dto';
import { MobileNetworkFindOneResponseApiDto } from '../dtos/mobile-network-find-one-response-api.dto';

@Service()
export class MobileNetworkFindOneApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(SETTINGS_API_URL);

    execute(
        dto?: MobileNetworkFindOneFilterApiDto,
        options?: FetchOptions
    ): Observable<MobileNetworkFindOneResponseApiDto> {
        const params = dto?.id ? `/${dto.id}` : '';
        const url = `${this.baseUrl}${COVERAGE_AREAS_ENDPOINTS.MOBILE_NETWORK}${params}`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<MobileNetworkFindOneResponseApiDto>(url, {
            context,
        });
    }
}
