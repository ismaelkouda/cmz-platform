import { HttpClient, HttpContext } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { AUTH_API_URL, BYPASS_CACHE } from '@cmz/core';
import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { TEAM_ORGANIZATION_ENDPOINTS } from '../endpoints/team-organization.endpoints';
import { TeamsPermissionsResponseApiDto } from '../dtos/teams-permissions-response-api.dto';

@Service()
export class TeamsPermissionsApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(AUTH_API_URL);

    readAll(
        options?: FetchOptions
    ): Observable<TeamsPermissionsResponseApiDto> {
        const url = `${this.baseUrl}${TEAM_ORGANIZATION_ENDPOINTS.TEAMS}/get-permissions-model`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<TeamsPermissionsResponseApiDto>(url, {
            context,
        });
    }
}
