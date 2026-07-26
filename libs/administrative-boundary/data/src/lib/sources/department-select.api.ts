import { HttpClient, HttpContext } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { BYPASS_CACHE, SETTINGS_API_URL } from '@cmz/core';
import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { ADMINISTRATIVE_BOUNDARY_ENDPOINTS } from '../endpoints/administrative-boundary.endpoints';
import { DepartmentSelectResponseApiDto } from '../dtos/department-select-response-api.dto';

@Service()
export class DepartmentSelectApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(SETTINGS_API_URL);

    readAll(
        options?: FetchOptions
    ): Observable<DepartmentSelectResponseApiDto> {
        const url = `${this.baseUrl}${ADMINISTRATIVE_BOUNDARY_ENDPOINTS.DEPARTMENT}/selected-field`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<DepartmentSelectResponseApiDto>(url, {
            context,
        });
    }
}
