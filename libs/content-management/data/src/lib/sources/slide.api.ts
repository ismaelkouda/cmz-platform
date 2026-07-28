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
import { SlideCreateApiDto } from '../dtos/slide-create-api.dto';
import { SlideUpdateApiDto } from '../dtos/slide-update-api.dto';
import { SlideDeleteApiDto } from '../dtos/slide-delete-api.dto';
import { SlideEnableApiDto } from '../dtos/slide-enable-api.dto';
import { SlideDisableApiDto } from '../dtos/slide-disable-api.dto';
import { SlideFilterApiDto } from '../dtos/slide-filter-api.dto';
import { SlideResponseApiDto } from '../dtos/slide-response-api.dto';

@Service()
export class SlideApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(SETTINGS_API_URL);

    readAll(
        dto: SlideFilterApiDto,
        page: string,
        options?: FetchOptions
    ): Observable<SlideResponseApiDto> {
        const url = `${this.baseUrl}${CONTENT_MANAGEMENT_ENDPOINTS.SLIDE}?page=${page}`;
        const params = buildHttpParams(dto);
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<SlideResponseApiDto>(url, { params, context });
    }

    create(dto: SlideCreateApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${CONTENT_MANAGEMENT_ENDPOINTS.SLIDE}/store`;
        const formData = buildFormData({ ...dto });
        return this.http.post<MessageResponseDto>(url, formData);
    }

    update(dto: SlideUpdateApiDto): Observable<MessageResponseDto> {
        const { id, ...rest } = dto;
        const url = `${this.baseUrl}${CONTENT_MANAGEMENT_ENDPOINTS.SLIDE}/${id}/update`;
        const formData = buildFormData({ ...rest });
        return this.http.post<MessageResponseDto>(url, formData);
    }

    delete(dto: SlideDeleteApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${CONTENT_MANAGEMENT_ENDPOINTS.SLIDE}/${dto.uniq_id}/delete`;
        return this.http.delete<MessageResponseDto>(url);
    }

    enable(dto: SlideEnableApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${CONTENT_MANAGEMENT_ENDPOINTS.SLIDE}/${dto.uniq_id}/enable`;
        return this.http.put<MessageResponseDto>(url, {});
    }

    disable(dto: SlideDisableApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${CONTENT_MANAGEMENT_ENDPOINTS.SLIDE}/${dto.uniq_id}/disable`;
        return this.http.put<MessageResponseDto>(url, {});
    }
}
