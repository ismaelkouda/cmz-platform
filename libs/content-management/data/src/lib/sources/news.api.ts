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
import { NewsCreateApiDto } from '../dtos/news-create-api.dto';
import { NewsUpdateApiDto } from '../dtos/news-update-api.dto';
import { NewsDeleteApiDto } from '../dtos/news-delete-api.dto';
import { NewsPublishApiDto } from '../dtos/news-publish-api.dto';
import { NewsUnpublishApiDto } from '../dtos/news-unpublish-api.dto';
import { NewsFilterApiDto } from '../dtos/news-filter-api.dto';
import { NewsResponseApiDto } from '../dtos/news-response-api.dto';

@Service()
export class NewsApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(SETTINGS_API_URL);

    readAll(
        dto: NewsFilterApiDto,
        page: string,
        options?: FetchOptions
    ): Observable<NewsResponseApiDto> {
        const url = `${this.baseUrl}${CONTENT_MANAGEMENT_ENDPOINTS.NEWS}?page=${page}`;
        const params = buildHttpParams(dto);
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<NewsResponseApiDto>(url, { params, context });
    }

    create(dto: NewsCreateApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${CONTENT_MANAGEMENT_ENDPOINTS.NEWS}/store`;
        const formData = buildFormData({ ...dto });
        return this.http.post<MessageResponseDto>(url, formData);
    }

    update(dto: NewsUpdateApiDto): Observable<MessageResponseDto> {
        const { id, ...rest } = dto;
        const url = `${this.baseUrl}${CONTENT_MANAGEMENT_ENDPOINTS.NEWS}/${id}/update`;
        const formData = buildFormData({ ...rest });
        return this.http.post<MessageResponseDto>(url, formData);
    }

    delete(dto: NewsDeleteApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${CONTENT_MANAGEMENT_ENDPOINTS.NEWS}/${dto.uniq_id}/delete`;
        return this.http.delete<MessageResponseDto>(url);
    }

    publish(dto: NewsPublishApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${CONTENT_MANAGEMENT_ENDPOINTS.NEWS}/${dto.uniq_id}/publish`;
        return this.http.put<MessageResponseDto>(url, {});
    }

    unpublish(dto: NewsUnpublishApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${CONTENT_MANAGEMENT_ENDPOINTS.NEWS}/${dto.uniq_id}/unpublish`;
        return this.http.put<MessageResponseDto>(url, {});
    }
}
