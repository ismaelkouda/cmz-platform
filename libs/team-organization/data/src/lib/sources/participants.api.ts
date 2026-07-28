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
import { ParticipantsCreateApiDto } from '../dtos/participants-create-api.dto';
import { ParticipantsUpdateApiDto } from '../dtos/participants-update-api.dto';
import { ParticipantsDeleteApiDto } from '../dtos/participants-delete-api.dto';
import { ParticipantsEnableApiDto } from '../dtos/participants-enable-api.dto';
import { ParticipantsDisableApiDto } from '../dtos/participants-disable-api.dto';
import { ParticipantsFilterApiDto } from '../dtos/participants-filter-api.dto';
import { ParticipantsResponseApiDto } from '../dtos/participants-response-api.dto';

@Service()
export class ParticipantsApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(AUTH_API_URL);

    readAll(
        dto: ParticipantsFilterApiDto,
        page: string,
        options?: FetchOptions
    ): Observable<ParticipantsResponseApiDto> {
        const url = `${this.baseUrl}${TEAM_ORGANIZATION_ENDPOINTS.PARTICIPANTS}?page=${page}`;
        const params = buildHttpParams(dto);
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<ParticipantsResponseApiDto>(url, {
            params,
            context,
        });
    }

    create(dto: ParticipantsCreateApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${TEAM_ORGANIZATION_ENDPOINTS.PARTICIPANTS}/store`;
        const payload = buildHttpPayload(dto, []);
        return this.http.post<MessageResponseDto>(url, payload);
    }

    update(dto: ParticipantsUpdateApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${TEAM_ORGANIZATION_ENDPOINTS.PARTICIPANTS}/${dto.id}/update`;
        const payload = buildHttpPayload(dto, ['id']);
        return this.http.post<MessageResponseDto>(url, payload);
    }

    delete(dto: ParticipantsDeleteApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${TEAM_ORGANIZATION_ENDPOINTS.PARTICIPANTS}/${dto.uniq_id}/delete`;
        return this.http.delete<MessageResponseDto>(url);
    }

    enable(dto: ParticipantsEnableApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${TEAM_ORGANIZATION_ENDPOINTS.PARTICIPANTS}/${dto.uniq_id}/enable`;
        return this.http.put<MessageResponseDto>(url, {});
    }

    disable(dto: ParticipantsDisableApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${TEAM_ORGANIZATION_ENDPOINTS.PARTICIPANTS}/${dto.uniq_id}/disable`;
        return this.http.put<MessageResponseDto>(url, {});
    }
}
