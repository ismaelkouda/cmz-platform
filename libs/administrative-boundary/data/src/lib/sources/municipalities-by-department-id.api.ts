import { HttpClient, HttpContext } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { BYPASS_CACHE, SETTINGS_API_URL } from '@cmz/core';
import { buildHttpParams } from '@cmz/shared-data';
import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { ADMINISTRATIVE_BOUNDARY_ENDPOINTS } from '../endpoints/administrative-boundary.endpoints';
import { MunicipalitiesByDepartmentIdFilterApiDto } from '../dtos/municipalities-by-department-id-filter-api.dto';
import { MunicipalitiesByDepartmentIdResponseApiDto } from '../dtos/municipalities-by-department-id-response-api.dto';

/** Vue imbriquée « communes d'un département » — lecture seule. */
@Service()
export class MunicipalitiesByDepartmentIdApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(SETTINGS_API_URL);

    readAll(
        dto: MunicipalitiesByDepartmentIdFilterApiDto,
        page: string,
        options?: FetchOptions
    ): Observable<MunicipalitiesByDepartmentIdResponseApiDto> {
        const url = `${this.baseUrl}${ADMINISTRATIVE_BOUNDARY_ENDPOINTS.DEPARTMENT}/${dto.department_id}/municipalities?page=${page}`;
        const params = buildHttpParams(dto);
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<MunicipalitiesByDepartmentIdResponseApiDto>(url, {
            params,
            context,
        });
    }
}
