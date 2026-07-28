import { HttpClient, HttpContext } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { BYPASS_CACHE, SETTINGS_API_URL } from '@cmz/core';
import {
    MessageResponseDto,
    buildFormData,
    buildHttpParams,
} from '@cmz/shared-data';
import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { CONTENT_MANAGEMENT_ENDPOINTS } from '../endpoints/content-management.endpoints';
import { HomeCreateApiDto } from '../dtos/home-create-api.dto';
import { HomeUpdateApiDto } from '../dtos/home-update-api.dto';
import { HomeDeleteApiDto } from '../dtos/home-delete-api.dto';
import { HomeEnableApiDto } from '../dtos/home-enable-api.dto';
import { HomeDisableApiDto } from '../dtos/home-disable-api.dto';
import { HomeFilterApiDto } from '../dtos/home-filter-api.dto';
import { HomeResponseApiDto } from '../dtos/home-response-api.dto';

/**
 * `create`/`update` envoient un `FormData` (`image_file`), comme
 * `optical-fiber-network` (`geom_file`) sur `coverage-areas` — même
 * utilitaire partagé `buildFormData`.
 */
@Service()
export class HomeApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(SETTINGS_API_URL);

    readAll(
        dto: HomeFilterApiDto,
        page: string,
        options?: FetchOptions
    ): Observable<HomeResponseApiDto> {
        const url = `${this.baseUrl}${CONTENT_MANAGEMENT_ENDPOINTS.HOME}?page=${page}`;
        const params = buildHttpParams(dto);
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<HomeResponseApiDto>(url, { params, context });
    }

    create(dto: HomeCreateApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${CONTENT_MANAGEMENT_ENDPOINTS.HOME}/store`;
        const formData = buildFormData({ ...dto });
        return this.http.post<MessageResponseDto>(url, formData);
    }

    update(dto: HomeUpdateApiDto): Observable<MessageResponseDto> {
        const { uniq_id, ...rest } = dto;
        const url = `${this.baseUrl}${CONTENT_MANAGEMENT_ENDPOINTS.HOME}/${uniq_id}/update`;
        const formData = buildFormData({ ...rest });
        return this.http.post<MessageResponseDto>(url, formData);
    }

    delete(dto: HomeDeleteApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${CONTENT_MANAGEMENT_ENDPOINTS.HOME}/${dto.uniq_id}/delete`;
        return this.http.delete<MessageResponseDto>(url);
    }

    enable(dto: HomeEnableApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${CONTENT_MANAGEMENT_ENDPOINTS.HOME}/${dto.uniq_id}/enable`;
        return this.http.put<MessageResponseDto>(url, {});
    }

    disable(dto: HomeDisableApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${CONTENT_MANAGEMENT_ENDPOINTS.HOME}/${dto.uniq_id}/disable`;
        return this.http.put<MessageResponseDto>(url, {});
    }
}
