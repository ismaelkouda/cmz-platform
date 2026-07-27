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
import { COVERAGE_AREAS_ENDPOINTS } from '../endpoints/coverage-areas.endpoints';
import { RadioRelayLinksCreateApiDto } from '../dtos/radio-relay-links-create-api.dto';
import { RadioRelayLinksUpdateApiDto } from '../dtos/radio-relay-links-update-api.dto';
import { RadioRelayLinksDeleteApiDto } from '../dtos/radio-relay-links-delete-api.dto';
import { RadioRelayLinksFilterApiDto } from '../dtos/radio-relay-links-filter-api.dto';
import { RadioRelayLinksResponseApiDto } from '../dtos/radio-relay-links-response-api.dto';
import { RadioRelayLinksEnableApiDto } from '../dtos/radio-relay-links-enable-api.dto';
import { RadioRelayLinksDisableApiDto } from '../dtos/radio-relay-links-disable-api.dto';

/**
 * Le source (`RadioRelayLinksApi`) construit un `FormData` (via
 * `formDataBuilder`) pour `create`/`update` alors qu'aucun champ fichier
 * n'existe sur cette entité (contrairement à `optical-fiber-network`). Écart
 * délibéré : JSON simple (`buildHttpPayload`) comme pour `mobile-network`, le
 * multipart n'apportant rien ici.
 */
@Service()
export class RadioRelayLinksApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(SETTINGS_API_URL);

    readAll(
        dto: RadioRelayLinksFilterApiDto,
        page: string,
        options?: FetchOptions
    ): Observable<RadioRelayLinksResponseApiDto> {
        const url = `${this.baseUrl}${COVERAGE_AREAS_ENDPOINTS.RADIO_RELAY_LINKS}?page=${page}`;
        const params = buildHttpParams(dto);
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<RadioRelayLinksResponseApiDto>(url, {
            params,
            context,
        });
    }

    create(dto: RadioRelayLinksCreateApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${COVERAGE_AREAS_ENDPOINTS.RADIO_RELAY_LINKS}/store`;
        const payload = buildHttpPayload(dto, []);
        return this.http.post<MessageResponseDto>(url, payload);
    }

    update(dto: RadioRelayLinksUpdateApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${COVERAGE_AREAS_ENDPOINTS.RADIO_RELAY_LINKS}/${dto.id}/update`;
        const payload = buildHttpPayload(dto, ['id']);
        return this.http.post<MessageResponseDto>(url, payload);
    }

    delete(dto: RadioRelayLinksDeleteApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${COVERAGE_AREAS_ENDPOINTS.RADIO_RELAY_LINKS}/${dto.uniq_id}/delete`;
        return this.http.delete<MessageResponseDto>(url);
    }

    enable(dto: RadioRelayLinksEnableApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${COVERAGE_AREAS_ENDPOINTS.RADIO_RELAY_LINKS}/${dto.uniq_id}/enable`;
        return this.http.put<MessageResponseDto>(url, {});
    }

    disable(dto: RadioRelayLinksDisableApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${COVERAGE_AREAS_ENDPOINTS.RADIO_RELAY_LINKS}/${dto.uniq_id}/disable`;
        return this.http.put<MessageResponseDto>(url, {});
    }
}
