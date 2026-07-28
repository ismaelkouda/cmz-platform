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
import { COMMUNICATION_ENDPOINTS } from '../endpoints/communication.endpoints';
import { MessagingCreateApiDto } from '../dtos/messaging-create-api.dto';
import { MessagingUpdateApiDto } from '../dtos/messaging-update-api.dto';
import { MessagingDeleteApiDto } from '../dtos/messaging-delete-api.dto';
import { MessagingEnableApiDto } from '../dtos/messaging-enable-api.dto';
import { MessagingDisableApiDto } from '../dtos/messaging-disable-api.dto';
import { MessagingFilterApiDto } from '../dtos/messaging-filter-api.dto';
import { MessagingResponseApiDto } from '../dtos/messaging-response-api.dto';

/**
 * Bug corrigé (source) : `delete`/`enable`/`disable` interpolaient l'objet
 * DTO entier dans l'URL (`${apiDto}/delete`, un objet `{uniq_id}` — donne
 * littéralement `[object Object]/delete`), au lieu de `${apiDto.uniq_id}`.
 */
@Service()
export class MessagingApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(AUTH_API_URL);

    readAll(
        dto: MessagingFilterApiDto,
        page: string,
        options?: FetchOptions
    ): Observable<MessagingResponseApiDto> {
        const url = `${this.baseUrl}${COMMUNICATION_ENDPOINTS.MESSAGING}?page=${page}`;
        const params = buildHttpParams(dto, { arrayFormat: 'comma' });
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<MessagingResponseApiDto>(url, {
            params,
            context,
        });
    }

    create(dto: MessagingCreateApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${COMMUNICATION_ENDPOINTS.MESSAGING}/store`;
        const payload = buildHttpPayload(dto, []);
        return this.http.post<MessageResponseDto>(url, payload);
    }

    update(dto: MessagingUpdateApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${COMMUNICATION_ENDPOINTS.MESSAGING}/${dto.id}/update`;
        const payload = buildHttpPayload(dto, ['id']);
        return this.http.post<MessageResponseDto>(url, payload);
    }

    delete(dto: MessagingDeleteApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${COMMUNICATION_ENDPOINTS.MESSAGING}/${dto.uniq_id}/delete`;
        return this.http.delete<MessageResponseDto>(url);
    }

    enable(dto: MessagingEnableApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${COMMUNICATION_ENDPOINTS.MESSAGING}/${dto.uniq_id}/enable`;
        return this.http.put<MessageResponseDto>(url, {});
    }

    disable(dto: MessagingDisableApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${COMMUNICATION_ENDPOINTS.MESSAGING}/${dto.uniq_id}/disable`;
        return this.http.put<MessageResponseDto>(url, {});
    }
}
