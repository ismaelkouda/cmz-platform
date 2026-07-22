import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BYPASS_CACHE } from '@core/interceptors/cache-context.token';
import { SETTINGS_API_URL } from '@core/config/config.tokens';
import { ResourcesCreateApiDto } from '@pages/seos-reference/infrastructure/api/dto/resources/resources-create-api.dto';
import { ResourcesDeleteApiDto } from '@pages/seos-reference/infrastructure/api/dto/resources/resources-delete-api.dto';
import { ResourcesFilterApiDto } from '@pages/seos-reference/infrastructure/api/dto/resources/resources-filter-api.dto';
import { ResourcesResponseApiDto } from '@pages/seos-reference/infrastructure/api/dto/resources/resources-response-api.dto';
import { ResourcesUpdateApiDto } from '@pages/seos-reference/infrastructure/api/dto/resources/resources-update-api.dto';
import { SEOS_REFERENCE_ENDPOINTS } from '@pages/seos-reference/infrastructure/api/seos-reference.endpoints';
import { MessageResponseDto } from '@shared/data/dto/simple-response.dto';
import { buildHttpParams } from '@shared/domain/utils/build-http-params.utils';
import { buildHttpPayload } from '@shared/domain/utils/build-http-payload.util';
import { FetchOptions } from '@shared/interface/fetch-options.interface';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ResourcesApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(SETTINGS_API_URL);

    readAll(
        dto: ResourcesFilterApiDto,
        page: string,
        options?: FetchOptions
    ): Observable<ResourcesResponseApiDto> {
        const url = `${this.baseUrl}${SEOS_REFERENCE_ENDPOINTS.RESOURCES}?page=${page}`;
        const params = buildHttpParams(dto);
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<ResourcesResponseApiDto>(url, { params, context });
    }

    create(apiDto: ResourcesCreateApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${SEOS_REFERENCE_ENDPOINTS.RESOURCES}/store`;
        const payload = buildHttpPayload(apiDto, []);
        return this.http.post<MessageResponseDto>(url, payload);
    }

    update(apiDto: ResourcesUpdateApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${SEOS_REFERENCE_ENDPOINTS.RESOURCES}/${apiDto.id}/update`;
        const payload = buildHttpPayload(apiDto, ['id']);
        return this.http.post<MessageResponseDto>(url, payload);
    }

    delete(apiDto: ResourcesDeleteApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${SEOS_REFERENCE_ENDPOINTS.RESOURCES}/${apiDto.uniq_id}/delete`;
        return this.http.delete<MessageResponseDto>(url);
    }
}
