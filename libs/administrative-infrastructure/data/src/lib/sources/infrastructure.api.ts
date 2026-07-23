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
import { InfrastructureCreateApiDto } from '../dtos/infrastructure-create-api.dto';
import { InfrastructureUpdateApiDto } from '../dtos/infrastructure-update-api.dto';
import { InfrastructureDeleteApiDto } from '../dtos/infrastructure-delete-api.dto';
import { InfrastructureFilterApiDto } from '../dtos/infrastructure-filter-api.dto';
import { InfrastructureResponseApiDto } from '../dtos/infrastructure-response-api.dto';

@Service()
export class InfrastructureApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(SETTINGS_API_URL);

    readAll(
        dto: InfrastructureFilterApiDto,
        page: string,
        options?: FetchOptions
    ): Observable<InfrastructureResponseApiDto> {
        const url = `${this.baseUrl}${ADMINISTRATIVE_INFRASTRUCTURE_ENDPOINTS.INFRASTRUCTURE}?page=${page}`;
        const params = buildHttpParams(dto);
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<InfrastructureResponseApiDto>(url, {
            params,
            context,
        });
    }

    create(dto: InfrastructureCreateApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${ADMINISTRATIVE_INFRASTRUCTURE_ENDPOINTS.INFRASTRUCTURE}/store`;
        const payload = buildHttpPayload(dto, []);
        return this.http.post<MessageResponseDto>(url, payload);
    }

    update(dto: InfrastructureUpdateApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${ADMINISTRATIVE_INFRASTRUCTURE_ENDPOINTS.INFRASTRUCTURE}/${dto.id}/update`;
        const payload = buildHttpPayload(dto, ['id']);
        return this.http.post<MessageResponseDto>(url, payload);
    }

    delete(dto: InfrastructureDeleteApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${ADMINISTRATIVE_INFRASTRUCTURE_ENDPOINTS.INFRASTRUCTURE}/${dto.uniq_id}/delete`;
        return this.http.delete<MessageResponseDto>(url);
    }
}
