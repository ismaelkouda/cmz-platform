import { HttpClient, HttpContext } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { BYPASS_CACHE, SETTINGS_API_URL } from '@cmz/core';
import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { ADMINISTRATIVE_INFRASTRUCTURE_ENDPOINTS } from '../endpoints/administrative-infrastructure.endpoints';
import { InfrastructureSelectResponseApiDto } from '../dtos/infrastructure-select-response-api.dto';

@Service()
export class InfrastructureSelectApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(SETTINGS_API_URL);

    readAll(
        options?: FetchOptions
    ): Observable<InfrastructureSelectResponseApiDto> {
        const url = `${this.baseUrl}${ADMINISTRATIVE_INFRASTRUCTURE_ENDPOINTS.INFRASTRUCTURE}`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<InfrastructureSelectResponseApiDto>(url, {
            context,
        });
    }
}
