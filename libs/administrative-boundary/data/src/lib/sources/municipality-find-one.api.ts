import { HttpClient, HttpContext } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { BYPASS_CACHE, SETTINGS_API_URL } from '@cmz/core';
import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { ADMINISTRATIVE_BOUNDARY_ENDPOINTS } from '../endpoints/administrative-boundary.endpoints';
import { MunicipalityFindOneFilterApiDto } from '../dtos/municipality-find-one-filter-api.dto';
import { MunicipalityFindOneResponseApiDto } from '../dtos/municipality-find-one-response-api.dto';

@Service()
export class MunicipalityFindOneApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(SETTINGS_API_URL);

    execute(
        dto: MunicipalityFindOneFilterApiDto,
        options?: FetchOptions
    ): Observable<MunicipalityFindOneResponseApiDto> {
        const url = `${this.baseUrl}${ADMINISTRATIVE_BOUNDARY_ENDPOINTS.MUNICIPALITY}/${dto.uniq_id}`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<MunicipalityFindOneResponseApiDto>(url, {
            context,
        });
    }
}
