import { HttpClient, HttpContext } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { BYPASS_CACHE, SETTINGS_API_URL } from '@cmz/core';
import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { SETTINGS_SECURITY_ENDPOINTS } from '../endpoints/settings-security.endpoints';
import { ProfilesPermissionsFindOneFilterApiDto } from '../dtos/profiles-permissions-find-one-filter-api.dto';
import { ProfilesPermissionsFindOneResponseApiDto } from '../dtos/profiles-permissions-find-one-response-api.dto';

@Service()
export class ProfilesPermissionsFindOneApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(SETTINGS_API_URL);

    execute(
        dto: ProfilesPermissionsFindOneFilterApiDto,
        options?: FetchOptions
    ): Observable<ProfilesPermissionsFindOneResponseApiDto> {
        const url = `${this.baseUrl}${SETTINGS_SECURITY_ENDPOINTS.PROFILES_PERMISSIONS}/${dto.id}`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<ProfilesPermissionsFindOneResponseApiDto>(url, {
            context,
        });
    }
}
