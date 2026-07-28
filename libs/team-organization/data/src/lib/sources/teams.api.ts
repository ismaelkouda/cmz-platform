import { HttpClient, HttpContext } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { AUTH_API_URL, BYPASS_CACHE } from '@cmz/core';
import {
    MessageResponseDto,
    buildHttpParams,
    buildHttpPayload,
} from '@cmz/shared-data';
import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { TEAM_ORGANIZATION_ENDPOINTS } from '../endpoints/team-organization.endpoints';
import { TeamsCreateApiDto } from '../dtos/teams-create-api.dto';
import { TeamsUpdateApiDto } from '../dtos/teams-update-api.dto';
import { TeamsDeleteApiDto } from '../dtos/teams-delete-api.dto';
import { TeamsEnableApiDto } from '../dtos/teams-enable-api.dto';
import { TeamsDisableApiDto } from '../dtos/teams-disable-api.dto';
import { TeamsFilterApiDto } from '../dtos/teams-filter-api.dto';
import { TeamsResponseApiDto } from '../dtos/teams-response-api.dto';

@Service()
export class TeamsApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(AUTH_API_URL);

    readAll(
        dto: TeamsFilterApiDto,
        page: string,
        options?: FetchOptions
    ): Observable<TeamsResponseApiDto> {
        const url = `${this.baseUrl}${TEAM_ORGANIZATION_ENDPOINTS.TEAMS}?page=${page}`;
        const params = buildHttpParams(dto);
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<TeamsResponseApiDto>(url, { params, context });
    }

    create(dto: TeamsCreateApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${TEAM_ORGANIZATION_ENDPOINTS.TEAMS}/store`;
        const payload = buildHttpPayload(dto, []);
        return this.http.post<MessageResponseDto>(url, payload);
    }

    update(dto: TeamsUpdateApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${TEAM_ORGANIZATION_ENDPOINTS.TEAMS}/${dto.id}/update`;
        const payload = buildHttpPayload(dto, ['id']);
        return this.http.post<MessageResponseDto>(url, payload);
    }

    delete(dto: TeamsDeleteApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${TEAM_ORGANIZATION_ENDPOINTS.TEAMS}/${dto.uniq_id}/delete`;
        return this.http.delete<MessageResponseDto>(url);
    }

    enable(dto: TeamsEnableApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${TEAM_ORGANIZATION_ENDPOINTS.TEAMS}/${dto.uniq_id}/enable`;
        return this.http.put<MessageResponseDto>(url, {});
    }

    disable(dto: TeamsDisableApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${TEAM_ORGANIZATION_ENDPOINTS.TEAMS}/${dto.uniq_id}/disable`;
        return this.http.put<MessageResponseDto>(url, {});
    }
}
