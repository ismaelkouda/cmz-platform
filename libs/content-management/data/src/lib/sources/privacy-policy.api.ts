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
import { PrivacyPolicyCreateApiDto } from '../dtos/privacy-policy-create-api.dto';
import { PrivacyPolicyUpdateApiDto } from '../dtos/privacy-policy-update-api.dto';
import { PrivacyPolicyDeleteApiDto } from '../dtos/privacy-policy-delete-api.dto';
import { PrivacyPolicyPublishApiDto } from '../dtos/privacy-policy-publish-api.dto';
import { PrivacyPolicyUnpublishApiDto } from '../dtos/privacy-policy-unpublish-api.dto';
import { PrivacyPolicyFilterApiDto } from '../dtos/privacy-policy-filter-api.dto';
import { PrivacyPolicyResponseApiDto } from '../dtos/privacy-policy-response-api.dto';

/** Document texte pur (version + contenu riche) — pas de fichier, JSON simple. */
@Service()
export class PrivacyPolicyApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(SETTINGS_API_URL);

    readAll(
        dto: PrivacyPolicyFilterApiDto,
        page: string,
        options?: FetchOptions
    ): Observable<PrivacyPolicyResponseApiDto> {
        const url = `${this.baseUrl}${CONTENT_MANAGEMENT_ENDPOINTS.PRIVACY_POLICY}?page=${page}`;
        const params = buildHttpParams(dto);
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<PrivacyPolicyResponseApiDto>(url, {
            params,
            context,
        });
    }

    create(dto: PrivacyPolicyCreateApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${CONTENT_MANAGEMENT_ENDPOINTS.PRIVACY_POLICY}/store`;
        const payload = buildHttpPayload(dto, []);
        return this.http.post<MessageResponseDto>(url, payload);
    }

    update(dto: PrivacyPolicyUpdateApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${CONTENT_MANAGEMENT_ENDPOINTS.PRIVACY_POLICY}/${dto.id}/update`;
        const payload = buildHttpPayload(dto, ['id']);
        return this.http.post<MessageResponseDto>(url, payload);
    }

    delete(dto: PrivacyPolicyDeleteApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${CONTENT_MANAGEMENT_ENDPOINTS.PRIVACY_POLICY}/${dto.uniq_id}/delete`;
        return this.http.delete<MessageResponseDto>(url);
    }

    publish(dto: PrivacyPolicyPublishApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${CONTENT_MANAGEMENT_ENDPOINTS.PRIVACY_POLICY}/${dto.uniq_id}/publish`;
        return this.http.put<MessageResponseDto>(url, {});
    }

    unpublish(
        dto: PrivacyPolicyUnpublishApiDto
    ): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${CONTENT_MANAGEMENT_ENDPOINTS.PRIVACY_POLICY}/${dto.uniq_id}/unpublish`;
        return this.http.put<MessageResponseDto>(url, {});
    }
}
