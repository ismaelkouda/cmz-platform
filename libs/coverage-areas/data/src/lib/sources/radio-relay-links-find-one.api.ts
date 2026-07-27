import { HttpClient, HttpContext } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { BYPASS_CACHE, SETTINGS_API_URL } from '@cmz/core';
import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { COVERAGE_AREAS_ENDPOINTS } from '../endpoints/coverage-areas.endpoints';
import { RadioRelayLinksFindOneFilterApiDto } from '../dtos/radio-relay-links-find-one-filter-api.dto';
import { RadioRelayLinksFindOneResponseApiDto } from '../dtos/radio-relay-links-find-one-response-api.dto';

@Service()
export class RadioRelayLinksFindOneApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(SETTINGS_API_URL);

    execute(
        dto?: RadioRelayLinksFindOneFilterApiDto,
        options?: FetchOptions
    ): Observable<RadioRelayLinksFindOneResponseApiDto> {
        const params = dto?.id ? `/${dto.id}` : '';
        const url = `${this.baseUrl}${COVERAGE_AREAS_ENDPOINTS.RADIO_RELAY_LINKS}${params}`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<RadioRelayLinksFindOneResponseApiDto>(url, {
            context,
        });
    }
}
