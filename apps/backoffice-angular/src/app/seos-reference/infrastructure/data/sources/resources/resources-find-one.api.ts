import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BYPASS_CACHE } from '@core/interceptors/cache-context.token';
import { SETTINGS_API_URL } from '@core/config/config.tokens';
import { ResourcesFindOneFilterApiDto } from '@pages/seos-reference/infrastructure/api/dto/resources/resources-find-one-filter-api.dto';
import { ResourcesFindOneResponseApiDto } from '@pages/seos-reference/infrastructure/api/dto/resources/resources-find-one-response-api.dto';
import { SEOS_REFERENCE_ENDPOINTS } from '@pages/seos-reference/infrastructure/api/seos-reference.endpoints';
import { FetchOptions } from '@shared/interface/fetch-options.interface';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ResourcesFindOneApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(SETTINGS_API_URL);

    execute(
        dto?: ResourcesFindOneFilterApiDto,
        options?: FetchOptions
    ): Observable<ResourcesFindOneResponseApiDto> {
        const params = dto?.id ? `/${dto.id}` : '';
        const url = `${this.baseUrl}${SEOS_REFERENCE_ENDPOINTS.RESOURCES}${params}`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<ResourcesFindOneResponseApiDto>(url, { context });
    }
}
