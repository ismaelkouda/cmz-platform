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
import { ADMINISTRATIVE_INFRASTRUCTURE_ENDPOINTS } from '../endpoints/administrative-infrastructure.endpoints';
import { InfrastructureTypeCreateApiDto } from '../dtos/infrastructure-type-create-api.dto';
import { InfrastructureTypeUpdateApiDto } from '../dtos/infrastructure-type-update-api.dto';
import { InfrastructureTypeDeleteApiDto } from '../dtos/infrastructure-type-delete-api.dto';
import { InfrastructureTypeFilterApiDto } from '../dtos/infrastructure-type-filter-api.dto';
import { InfrastructureTypeResponseApiDto } from '../dtos/infrastructure-type-response-api.dto';
import { InfrastructureTypeEnableApiDto } from '../dtos/infrastructure-type-enable-api.dto';
import { InfrastructureTypeDisableApiDto } from '../dtos/infrastructure-type-disable-api.dto';

@Service()
export class InfrastructureTypeApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(SETTINGS_API_URL);

    readAll(
        dto: InfrastructureTypeFilterApiDto,
        page: string,
        options?: FetchOptions
    ): Observable<InfrastructureTypeResponseApiDto> {
        const url = `${this.baseUrl}${ADMINISTRATIVE_INFRASTRUCTURE_ENDPOINTS.INFRASTRUCTURE_TYPE}?page=${page}`;
        const params = buildHttpParams(dto);
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<InfrastructureTypeResponseApiDto>(url, {
            params,
            context,
        });
    }

    create(
        dto: InfrastructureTypeCreateApiDto
    ): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${ADMINISTRATIVE_INFRASTRUCTURE_ENDPOINTS.INFRASTRUCTURE_TYPE}/store`;
        const payload = buildHttpPayload(dto, []);
        return this.http.post<MessageResponseDto>(url, payload);
    }

    update(
        dto: InfrastructureTypeUpdateApiDto
    ): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${ADMINISTRATIVE_INFRASTRUCTURE_ENDPOINTS.INFRASTRUCTURE_TYPE}/${dto.id}/update`;
        const payload = buildHttpPayload(dto, ['id']);
        return this.http.post<MessageResponseDto>(url, payload);
    }

    delete(
        dto: InfrastructureTypeDeleteApiDto
    ): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${ADMINISTRATIVE_INFRASTRUCTURE_ENDPOINTS.INFRASTRUCTURE_TYPE}/${dto.uniq_id}/delete`;
        return this.http.delete<MessageResponseDto>(url);
    }
    enable(
        dto: InfrastructureTypeEnableApiDto
    ): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${ADMINISTRATIVE_INFRASTRUCTURE_ENDPOINTS.INFRASTRUCTURE_TYPE}/${dto.uniq_id}/enable`;
        return this.http.put<MessageResponseDto>(url, {});
    }

    disable(
        dto: InfrastructureTypeDisableApiDto
    ): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${ADMINISTRATIVE_INFRASTRUCTURE_ENDPOINTS.INFRASTRUCTURE_TYPE}/${dto.uniq_id}/disable`;
        return this.http.put<MessageResponseDto>(url, {});
    }
}
