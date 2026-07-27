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
import { MobileNetworkCreateApiDto } from '../dtos/mobile-network-create-api.dto';
import { MobileNetworkUpdateApiDto } from '../dtos/mobile-network-update-api.dto';
import { MobileNetworkDeleteApiDto } from '../dtos/mobile-network-delete-api.dto';
import { MobileNetworkFilterApiDto } from '../dtos/mobile-network-filter-api.dto';
import { MobileNetworkResponseApiDto } from '../dtos/mobile-network-response-api.dto';
import { MobileNetworkEnableApiDto } from '../dtos/mobile-network-enable-api.dto';
import { MobileNetworkDisableApiDto } from '../dtos/mobile-network-disable-api.dto';

@Service()
export class MobileNetworkApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(SETTINGS_API_URL);

    readAll(
        dto: MobileNetworkFilterApiDto,
        page: string,
        options?: FetchOptions
    ): Observable<MobileNetworkResponseApiDto> {
        const url = `${this.baseUrl}${COVERAGE_AREAS_ENDPOINTS.MOBILE_NETWORK}?page=${page}`;
        const params = buildHttpParams(dto);
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<MobileNetworkResponseApiDto>(url, {
            params,
            context,
        });
    }

    create(dto: MobileNetworkCreateApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${COVERAGE_AREAS_ENDPOINTS.MOBILE_NETWORK}/store`;
        const payload = buildHttpPayload(dto, []);
        return this.http.post<MessageResponseDto>(url, payload);
    }

    update(dto: MobileNetworkUpdateApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${COVERAGE_AREAS_ENDPOINTS.MOBILE_NETWORK}/${dto.id}/update`;
        const payload = buildHttpPayload(dto, ['id']);
        return this.http.post<MessageResponseDto>(url, payload);
    }

    delete(dto: MobileNetworkDeleteApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${COVERAGE_AREAS_ENDPOINTS.MOBILE_NETWORK}/${dto.uniq_id}/delete`;
        return this.http.delete<MessageResponseDto>(url);
    }

    enable(dto: MobileNetworkEnableApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${COVERAGE_AREAS_ENDPOINTS.MOBILE_NETWORK}/${dto.uniq_id}/enable`;
        return this.http.put<MessageResponseDto>(url, {});
    }

    disable(dto: MobileNetworkDisableApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${COVERAGE_AREAS_ENDPOINTS.MOBILE_NETWORK}/${dto.uniq_id}/disable`;
        return this.http.put<MessageResponseDto>(url, {});
    }
}
