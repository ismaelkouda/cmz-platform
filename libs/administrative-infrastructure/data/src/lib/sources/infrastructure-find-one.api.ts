import { HttpClient, HttpContext } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { BYPASS_CACHE, SETTINGS_API_URL } from '@cmz/core';
import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { ADMINISTRATIVE_INFRASTRUCTURE_ENDPOINTS } from '../endpoints/administrative-infrastructure.endpoints';
import { InfrastructureFindOneFilterApiDto } from '../dtos/infrastructure-find-one-filter-api.dto';
import { InfrastructureFindOneResponseApiDto } from '../dtos/infrastructure-find-one-response-api.dto';

@Service()
export class InfrastructureFindOneApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(SETTINGS_API_URL);

    execute(
        dto?: InfrastructureFindOneFilterApiDto,
        options?: FetchOptions
    ): Observable<InfrastructureFindOneResponseApiDto> {
        const params = dto?.id ? `/${dto.id}` : '';
        const url = `${this.baseUrl}${ADMINISTRATIVE_INFRASTRUCTURE_ENDPOINTS.INFRASTRUCTURE}${params}`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<InfrastructureFindOneResponseApiDto>(url, {
            context,
        });
    }
}
