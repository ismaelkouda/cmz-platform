import { HttpClient, HttpContext } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { BYPASS_CACHE, SETTINGS_API_URL } from '@cmz/core';
import { buildHttpParams } from '@cmz/shared-data';
import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { ADMINISTRATIVE_BOUNDARY_ENDPOINTS } from '../endpoints/administrative-boundary.endpoints';
import { DepartmentsByRegionIdFilterApiDto } from '../dtos/departments-by-region-id-filter-api.dto';
import { DepartmentsByRegionIdResponseApiDto } from '../dtos/departments-by-region-id-response-api.dto';

/** Vue imbriquée « départements d'une région » — lecture seule. */
@Service()
export class DepartmentsByRegionIdApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(SETTINGS_API_URL);

    readAll(
        dto: DepartmentsByRegionIdFilterApiDto,
        page: string,
        options?: FetchOptions
    ): Observable<DepartmentsByRegionIdResponseApiDto> {
        const url = `${this.baseUrl}${ADMINISTRATIVE_BOUNDARY_ENDPOINTS.REGION}/${dto.region_id}/departments?page=${page}`;
        const params = buildHttpParams(dto);
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<DepartmentsByRegionIdResponseApiDto>(url, {
            params,
            context,
        });
    }
}
