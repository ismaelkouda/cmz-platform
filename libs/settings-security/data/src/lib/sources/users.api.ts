import { HttpClient, HttpContext } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { BYPASS_CACHE, SETTINGS_API_URL } from '@cmz/core';
import {
    MessageResponseDto,
    buildHttpParams,
    buildHttpPayload,
} from '@cmz/shared-data';
import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { SETTINGS_SECURITY_ENDPOINTS } from '../endpoints/settings-security.endpoints';
import { UsersCreateApiDto } from '../dtos/users-create-api.dto';
import { UsersUpdateApiDto } from '../dtos/users-update-api.dto';
import { UsersDeleteApiDto } from '../dtos/users-delete-api.dto';
import { UsersEnableApiDto } from '../dtos/users-enable-api.dto';
import { UsersDisableApiDto } from '../dtos/users-disable-api.dto';
import { UsersFilterApiDto } from '../dtos/users-filter-api.dto';
import { UsersResponseApiDto } from '../dtos/users-response-api.dto';

@Service()
export class UsersApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(SETTINGS_API_URL);

    readAll(
        dto: UsersFilterApiDto,
        page: string,
        options?: FetchOptions
    ): Observable<UsersResponseApiDto> {
        const url = `${this.baseUrl}${SETTINGS_SECURITY_ENDPOINTS.USERS}?page=${page}`;
        const params = buildHttpParams(dto);
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<UsersResponseApiDto>(url, { params, context });
    }

    create(dto: UsersCreateApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${SETTINGS_SECURITY_ENDPOINTS.USERS}/store`;
        const payload = buildHttpPayload(dto, []);
        return this.http.post<MessageResponseDto>(url, payload);
    }

    update(dto: UsersUpdateApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${SETTINGS_SECURITY_ENDPOINTS.USERS}/${dto.id}/update`;
        const payload = buildHttpPayload(dto, ['id']);
        return this.http.post<MessageResponseDto>(url, payload);
    }

    delete(dto: UsersDeleteApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${SETTINGS_SECURITY_ENDPOINTS.USERS}/${dto.uniq_id}/delete`;
        return this.http.delete<MessageResponseDto>(url);
    }

    enable(dto: UsersEnableApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${SETTINGS_SECURITY_ENDPOINTS.USERS}/${dto.uniq_id}/enable`;
        return this.http.put<MessageResponseDto>(url, {});
    }

    disable(dto: UsersDisableApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${SETTINGS_SECURITY_ENDPOINTS.USERS}/${dto.uniq_id}/disable`;
        return this.http.put<MessageResponseDto>(url, {});
    }
}
