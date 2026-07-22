import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BYPASS_CACHE } from '@core/interceptors/cache-context.token';
import { SETTINGS_API_URL } from '@core/config/config.tokens';
import { ResourcesSelectResponseApiDto } from '@pages/seos-reference/infrastructure/api/dto/resources/resources-select-response-api.dto';
import { SEOS_REFERENCE_ENDPOINTS } from '@pages/seos-reference/infrastructure/api/seos-reference.endpoints';
import { FetchOptions } from '@shared/interface/fetch-options.interface';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ResourcesSelectApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(SETTINGS_API_URL);

    readAll(options?: FetchOptions): Observable<ResourcesSelectResponseApiDto> {
        const url = `${this.baseUrl}${SEOS_REFERENCE_ENDPOINTS.RESOURCES}`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<ResourcesSelectResponseApiDto>(url, { context });
    }
}
