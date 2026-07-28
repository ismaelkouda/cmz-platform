import { HttpClient, HttpContext } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { BYPASS_CACHE, SETTINGS_API_URL } from '@cmz/core';
import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { SETTINGS_SECURITY_ENDPOINTS } from '../endpoints/settings-security.endpoints';
import { ProfilesPermissionsPermissionsResponseApiDto } from '../dtos/profiles-permissions-permissions-response-api.dto';

@Service()
export class ProfilesPermissionsPermissionsApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(SETTINGS_API_URL);

    readAll(
        options?: FetchOptions
    ): Observable<ProfilesPermissionsPermissionsResponseApiDto> {
        const url = `${this.baseUrl}${SETTINGS_SECURITY_ENDPOINTS.PROFILES_PERMISSIONS}/get-permissions-model`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<ProfilesPermissionsPermissionsResponseApiDto>(
            url,
            { context }
        );
    }
}
