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
import { ProfilesPermissionsCreateApiDto } from '../dtos/profiles-permissions-create-api.dto';
import { ProfilesPermissionsUpdateApiDto } from '../dtos/profiles-permissions-update-api.dto';
import { ProfilesPermissionsDeleteApiDto } from '../dtos/profiles-permissions-delete-api.dto';
import { ProfilesPermissionsEnableApiDto } from '../dtos/profiles-permissions-enable-api.dto';
import { ProfilesPermissionsDisableApiDto } from '../dtos/profiles-permissions-disable-api.dto';
import { ProfilesPermissionsFilterApiDto } from '../dtos/profiles-permissions-filter-api.dto';
import { ProfilesPermissionsResponseApiDto } from '../dtos/profiles-permissions-response-api.dto';

@Service()
export class ProfilesPermissionsApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(SETTINGS_API_URL);

    readAll(
        dto: ProfilesPermissionsFilterApiDto,
        page: string,
        options?: FetchOptions
    ): Observable<ProfilesPermissionsResponseApiDto> {
        const url = `${this.baseUrl}${SETTINGS_SECURITY_ENDPOINTS.PROFILES_PERMISSIONS}?page=${page}`;
        const params = buildHttpParams(dto);
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<ProfilesPermissionsResponseApiDto>(url, {
            params,
            context,
        });
    }

    create(
        dto: ProfilesPermissionsCreateApiDto
    ): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${SETTINGS_SECURITY_ENDPOINTS.PROFILES_PERMISSIONS}/store`;
        const payload = buildHttpPayload(dto, []);
        return this.http.post<MessageResponseDto>(url, payload);
    }

    update(
        dto: ProfilesPermissionsUpdateApiDto
    ): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${SETTINGS_SECURITY_ENDPOINTS.PROFILES_PERMISSIONS}/${dto.id}/update`;
        const payload = buildHttpPayload(dto, ['id']);
        return this.http.post<MessageResponseDto>(url, payload);
    }

    delete(
        dto: ProfilesPermissionsDeleteApiDto
    ): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${SETTINGS_SECURITY_ENDPOINTS.PROFILES_PERMISSIONS}/${dto.uniq_id}/delete`;
        return this.http.delete<MessageResponseDto>(url);
    }

    enable(
        dto: ProfilesPermissionsEnableApiDto
    ): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${SETTINGS_SECURITY_ENDPOINTS.PROFILES_PERMISSIONS}/${dto.uniq_id}/enable`;
        return this.http.put<MessageResponseDto>(url, {});
    }

    disable(
        dto: ProfilesPermissionsDisableApiDto
    ): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${SETTINGS_SECURITY_ENDPOINTS.PROFILES_PERMISSIONS}/${dto.uniq_id}/disable`;
        return this.http.put<MessageResponseDto>(url, {});
    }
}
