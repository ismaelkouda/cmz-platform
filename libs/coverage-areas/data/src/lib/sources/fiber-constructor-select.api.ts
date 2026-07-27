import { HttpClient, HttpContext } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { BYPASS_CACHE, SETTINGS_API_URL } from '@cmz/core';
import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { COVERAGE_AREAS_ENDPOINTS } from '../endpoints/coverage-areas.endpoints';
import { FiberConstructorSelectResponseApiDto } from '../dtos/fiber-constructor-select-response-api.dto';

@Service()
export class FiberConstructorSelectApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(SETTINGS_API_URL);

    readAll(
        options?: FetchOptions
    ): Observable<FiberConstructorSelectResponseApiDto> {
        const url = `${this.baseUrl}${COVERAGE_AREAS_ENDPOINTS.FIBER_CONSTRUCTOR}/select-field`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<FiberConstructorSelectResponseApiDto>(url, {
            context,
        });
    }
}
