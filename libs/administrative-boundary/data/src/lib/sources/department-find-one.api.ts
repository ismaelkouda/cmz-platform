import { HttpClient, HttpContext } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { BYPASS_CACHE, SETTINGS_API_URL } from '@cmz/core';
import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { ADMINISTRATIVE_BOUNDARY_ENDPOINTS } from '../endpoints/administrative-boundary.endpoints';
import { DepartmentFindOneFilterApiDto } from '../dtos/department-find-one-filter-api.dto';
import { DepartmentFindOneResponseApiDto } from '../dtos/department-find-one-response-api.dto';

@Service()
export class DepartmentFindOneApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(SETTINGS_API_URL);

    execute(
        dto: DepartmentFindOneFilterApiDto,
        options?: FetchOptions
    ): Observable<DepartmentFindOneResponseApiDto> {
        const url = `${this.baseUrl}${ADMINISTRATIVE_BOUNDARY_ENDPOINTS.DEPARTMENT}/${dto.uniq_id}`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<DepartmentFindOneResponseApiDto>(url, {
            context,
        });
    }
}
