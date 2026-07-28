import { HttpClient, HttpContext } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { AUTH_API_URL, BYPASS_CACHE } from '@cmz/core';
import { MessageResponseDto, buildHttpParams } from '@cmz/shared-data';
import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { COMMUNICATION_ENDPOINTS } from '../endpoints/communication.endpoints';
import { NotificationsFilterApiDto } from '../dtos/notifications-filter-api.dto';
import { NotificationsReadOneApiDto } from '../dtos/notifications-read-one-api.dto';
import { NotificationsResponseApiDto } from '../dtos/notifications-response-api.dto';

@Service()
export class NotificationsApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(AUTH_API_URL);

    execute(
        dto: NotificationsFilterApiDto,
        page: string,
        options?: FetchOptions
    ): Observable<NotificationsResponseApiDto> {
        const url = `${this.baseUrl}${COMMUNICATION_ENDPOINTS.NOTIFICATIONS}?page=${page}`;
        const params = buildHttpParams(dto);
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<NotificationsResponseApiDto>(url, {
            params,
            context,
        });
    }

    readOne(dto: NotificationsReadOneApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${COMMUNICATION_ENDPOINTS.NOTIFICATIONS}/${dto.uniq_id}/read`;
        return this.http.put<MessageResponseDto>(url, {});
    }

    readAll(): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${COMMUNICATION_ENDPOINTS.NOTIFICATIONS}/read-all`;
        return this.http.put<MessageResponseDto>(url, {});
    }
}
