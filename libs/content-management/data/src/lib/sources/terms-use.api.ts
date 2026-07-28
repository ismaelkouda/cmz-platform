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
import { TermsUseCreateApiDto } from '../dtos/terms-use-create-api.dto';
import { TermsUseUpdateApiDto } from '../dtos/terms-use-update-api.dto';
import { TermsUseDeleteApiDto } from '../dtos/terms-use-delete-api.dto';
import { TermsUsePublishApiDto } from '../dtos/terms-use-publish-api.dto';
import { TermsUseUnpublishApiDto } from '../dtos/terms-use-unpublish-api.dto';
import { TermsUseFilterApiDto } from '../dtos/terms-use-filter-api.dto';
import { TermsUseResponseApiDto } from '../dtos/terms-use-response-api.dto';

/** Document texte pur (version + contenu riche) — pas de fichier, JSON simple. */
@Service()
export class TermsUseApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(SETTINGS_API_URL);

    readAll(
        dto: TermsUseFilterApiDto,
        page: string,
        options?: FetchOptions
    ): Observable<TermsUseResponseApiDto> {
        const url = `${this.baseUrl}${CONTENT_MANAGEMENT_ENDPOINTS.TERMS_USE}?page=${page}`;
        const params = buildHttpParams(dto);
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<TermsUseResponseApiDto>(url, { params, context });
    }

    create(dto: TermsUseCreateApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${CONTENT_MANAGEMENT_ENDPOINTS.TERMS_USE}/store`;
        const payload = buildHttpPayload(dto, []);
        return this.http.post<MessageResponseDto>(url, payload);
    }

    update(dto: TermsUseUpdateApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${CONTENT_MANAGEMENT_ENDPOINTS.TERMS_USE}/${dto.id}/update`;
        const payload = buildHttpPayload(dto, ['id']);
        return this.http.post<MessageResponseDto>(url, payload);
    }

    delete(dto: TermsUseDeleteApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${CONTENT_MANAGEMENT_ENDPOINTS.TERMS_USE}/${dto.uniq_id}/delete`;
        return this.http.delete<MessageResponseDto>(url);
    }

    publish(dto: TermsUsePublishApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${CONTENT_MANAGEMENT_ENDPOINTS.TERMS_USE}/${dto.uniq_id}/publish`;
        return this.http.put<MessageResponseDto>(url, {});
    }

    unpublish(dto: TermsUseUnpublishApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${CONTENT_MANAGEMENT_ENDPOINTS.TERMS_USE}/${dto.uniq_id}/unpublish`;
        return this.http.put<MessageResponseDto>(url, {});
    }
}
