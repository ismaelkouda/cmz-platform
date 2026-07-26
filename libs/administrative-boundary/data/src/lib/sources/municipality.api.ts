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
import { ADMINISTRATIVE_BOUNDARY_ENDPOINTS } from '../endpoints/administrative-boundary.endpoints';
import { MunicipalityCreateApiDto } from '../dtos/municipality-create-api.dto';
import { MunicipalityUpdateApiDto } from '../dtos/municipality-update-api.dto';
import { MunicipalityDeleteApiDto } from '../dtos/municipality-delete-api.dto';
import { MunicipalityFilterApiDto } from '../dtos/municipality-filter-api.dto';
import { MunicipalityResponseApiDto } from '../dtos/municipality-response-api.dto';

@Service()
export class MunicipalityApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(SETTINGS_API_URL);

    readAll(
        dto: MunicipalityFilterApiDto,
        page: string,
        options?: FetchOptions
    ): Observable<MunicipalityResponseApiDto> {
        const url = `${this.baseUrl}${ADMINISTRATIVE_BOUNDARY_ENDPOINTS.MUNICIPALITY}?page=${page}`;
        const params = buildHttpParams(dto);
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<MunicipalityResponseApiDto>(url, {
            params,
            context,
        });
    }

    create(dto: MunicipalityCreateApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${ADMINISTRATIVE_BOUNDARY_ENDPOINTS.MUNICIPALITY}/store`;
        const payload = buildHttpPayload(dto, []);
        return this.http.post<MessageResponseDto>(url, payload);
    }

    update(dto: MunicipalityUpdateApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${ADMINISTRATIVE_BOUNDARY_ENDPOINTS.MUNICIPALITY}/${dto.id}/update`;
        const payload = buildHttpPayload(dto, ['id']);
        return this.http.post<MessageResponseDto>(url, payload);
    }

    delete(dto: MunicipalityDeleteApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${ADMINISTRATIVE_BOUNDARY_ENDPOINTS.MUNICIPALITY}/${dto.uniq_id}/delete`;
        return this.http.delete<MessageResponseDto>(url);
    }
}
