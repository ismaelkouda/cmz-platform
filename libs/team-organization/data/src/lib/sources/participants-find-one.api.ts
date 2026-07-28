import { HttpClient, HttpContext } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { AUTH_API_URL, BYPASS_CACHE } from '@cmz/core';
import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { TEAM_ORGANIZATION_ENDPOINTS } from '../endpoints/team-organization.endpoints';
import { ParticipantsFindOneFilterApiDto } from '../dtos/participants-find-one-filter-api.dto';
import { ParticipantsFindOneResponseApiDto } from '../dtos/participants-find-one-response-api.dto';

@Service()
export class ParticipantsFindOneApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(AUTH_API_URL);

    execute(
        dto?: ParticipantsFindOneFilterApiDto,
        options?: FetchOptions
    ): Observable<ParticipantsFindOneResponseApiDto> {
        const path = dto?.id ? `/${dto.id}` : '';
        const url = `${this.baseUrl}${TEAM_ORGANIZATION_ENDPOINTS.PARTICIPANTS}${path}`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<ParticipantsFindOneResponseApiDto>(url, {
            context,
        });
    }
}
