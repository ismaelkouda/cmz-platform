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
import { CONTENT_MANAGEMENT_ENDPOINTS } from '../endpoints/content-management.endpoints';
import { LegalNoticeCreateApiDto } from '../dtos/legal-notice-create-api.dto';
import { LegalNoticeUpdateApiDto } from '../dtos/legal-notice-update-api.dto';
import { LegalNoticeDeleteApiDto } from '../dtos/legal-notice-delete-api.dto';
import { LegalNoticePublishApiDto } from '../dtos/legal-notice-publish-api.dto';
import { LegalNoticeUnpublishApiDto } from '../dtos/legal-notice-unpublish-api.dto';
import { LegalNoticeFilterApiDto } from '../dtos/legal-notice-filter-api.dto';
import { LegalNoticeResponseApiDto } from '../dtos/legal-notice-response-api.dto';

/** Document texte pur (version + contenu riche) — pas de fichier, JSON simple. */
@Service()
export class LegalNoticeApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(SETTINGS_API_URL);

    readAll(
        dto: LegalNoticeFilterApiDto,
        page: string,
        options?: FetchOptions
    ): Observable<LegalNoticeResponseApiDto> {
        const url = `${this.baseUrl}${CONTENT_MANAGEMENT_ENDPOINTS.LEGAL_NOTICE}?page=${page}`;
        const params = buildHttpParams(dto);
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<LegalNoticeResponseApiDto>(url, {
            params,
            context,
        });
    }

    create(dto: LegalNoticeCreateApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${CONTENT_MANAGEMENT_ENDPOINTS.LEGAL_NOTICE}/store`;
        const payload = buildHttpPayload(dto, []);
        return this.http.post<MessageResponseDto>(url, payload);
    }

    update(dto: LegalNoticeUpdateApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${CONTENT_MANAGEMENT_ENDPOINTS.LEGAL_NOTICE}/${dto.id}/update`;
        const payload = buildHttpPayload(dto, ['id']);
        return this.http.post<MessageResponseDto>(url, payload);
    }

    delete(dto: LegalNoticeDeleteApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${CONTENT_MANAGEMENT_ENDPOINTS.LEGAL_NOTICE}/${dto.uniq_id}/delete`;
        return this.http.delete<MessageResponseDto>(url);
    }

    publish(dto: LegalNoticePublishApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${CONTENT_MANAGEMENT_ENDPOINTS.LEGAL_NOTICE}/${dto.uniq_id}/publish`;
        return this.http.put<MessageResponseDto>(url, {});
    }

    unpublish(dto: LegalNoticeUnpublishApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${CONTENT_MANAGEMENT_ENDPOINTS.LEGAL_NOTICE}/${dto.uniq_id}/unpublish`;
        return this.http.put<MessageResponseDto>(url, {});
    }
}
