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
import { SiteGroupCreateApiDto } from '../dtos/site-group-create-api.dto';
import { SiteGroupUpdateApiDto } from '../dtos/site-group-update-api.dto';
import { SiteGroupDeleteApiDto } from '../dtos/site-group-delete-api.dto';
import { SiteGroupFilterApiDto } from '../dtos/site-group-filter-api.dto';
import { SiteGroupResponseApiDto } from '../dtos/site-group-response-api.dto';
import { SiteGroupEnableApiDto } from '../dtos/site-group-enable-api.dto';
import { SiteGroupDisableApiDto } from '../dtos/site-group-disable-api.dto';

@Service()
export class SiteGroupApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(SETTINGS_API_URL);

    readAll(
        dto: SiteGroupFilterApiDto,
        page: string,
        options?: FetchOptions
    ): Observable<SiteGroupResponseApiDto> {
        const url = `${this.baseUrl}${COVERAGE_AREAS_ENDPOINTS.SITE_GROUP}?page=${page}`;
        const params = buildHttpParams(dto);
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<SiteGroupResponseApiDto>(url, {
            params,
            context,
        });
    }

    create(dto: SiteGroupCreateApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${COVERAGE_AREAS_ENDPOINTS.SITE_GROUP}/store`;
        const payload = buildHttpPayload(dto, []);
        return this.http.post<MessageResponseDto>(url, payload);
    }

    update(dto: SiteGroupUpdateApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${COVERAGE_AREAS_ENDPOINTS.SITE_GROUP}/${dto.id}/update`;
        const payload = buildHttpPayload(dto, ['id']);
        return this.http.post<MessageResponseDto>(url, payload);
    }

    delete(dto: SiteGroupDeleteApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${COVERAGE_AREAS_ENDPOINTS.SITE_GROUP}/${dto.uniq_id}/delete`;
        return this.http.delete<MessageResponseDto>(url);
    }

    enable(dto: SiteGroupEnableApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${COVERAGE_AREAS_ENDPOINTS.SITE_GROUP}/${dto.uniq_id}/enable`;
        return this.http.put<MessageResponseDto>(url, {});
    }

    disable(dto: SiteGroupDisableApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${COVERAGE_AREAS_ENDPOINTS.SITE_GROUP}/${dto.uniq_id}/disable`;
        return this.http.put<MessageResponseDto>(url, {});
    }
}
