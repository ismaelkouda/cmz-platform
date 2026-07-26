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
import { RegionCreateApiDto } from '../dtos/region-create-api.dto';
import { RegionUpdateApiDto } from '../dtos/region-update-api.dto';
import { RegionDeleteApiDto } from '../dtos/region-delete-api.dto';
import { RegionFilterApiDto } from '../dtos/region-filter-api.dto';
import { RegionResponseApiDto } from '../dtos/region-response-api.dto';

@Service()
export class RegionApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(SETTINGS_API_URL);

    readAll(
        dto: RegionFilterApiDto,
        page: string,
        options?: FetchOptions
    ): Observable<RegionResponseApiDto> {
        const url = `${this.baseUrl}${ADMINISTRATIVE_BOUNDARY_ENDPOINTS.REGION}?page=${page}`;
        const params = buildHttpParams(dto);
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<RegionResponseApiDto>(url, { params, context });
    }

    create(dto: RegionCreateApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${ADMINISTRATIVE_BOUNDARY_ENDPOINTS.REGION}/store`;
        const payload = buildHttpPayload(dto, []);
        return this.http.post<MessageResponseDto>(url, payload);
    }

    update(dto: RegionUpdateApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${ADMINISTRATIVE_BOUNDARY_ENDPOINTS.REGION}/${dto.id}/update`;
        const payload = buildHttpPayload(dto, ['id']);
        return this.http.post<MessageResponseDto>(url, payload);
    }

    delete(dto: RegionDeleteApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${ADMINISTRATIVE_BOUNDARY_ENDPOINTS.REGION}/${dto.uniq_id}/delete`;
        return this.http.delete<MessageResponseDto>(url);
    }
}
