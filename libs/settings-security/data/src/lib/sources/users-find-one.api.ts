import { HttpClient, HttpContext } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { BYPASS_CACHE, SETTINGS_API_URL } from '@cmz/core';
import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { SETTINGS_SECURITY_ENDPOINTS } from '../endpoints/settings-security.endpoints';
import { UsersFindOneFilterApiDto } from '../dtos/users-find-one-filter-api.dto';
import { UsersFindOneResponseApiDto } from '../dtos/users-find-one-response-api.dto';

@Service()
export class UsersFindOneApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(SETTINGS_API_URL);

    execute(
        dto: UsersFindOneFilterApiDto,
        options?: FetchOptions
    ): Observable<UsersFindOneResponseApiDto> {
        const suffix = dto.id ? `/${dto.id}` : '';
        const url = `${this.baseUrl}${SETTINGS_SECURITY_ENDPOINTS.USERS}${suffix}`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<UsersFindOneResponseApiDto>(url, { context });
    }
}
