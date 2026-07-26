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
import { DepartmentCreateApiDto } from '../dtos/department-create-api.dto';
import { DepartmentUpdateApiDto } from '../dtos/department-update-api.dto';
import { DepartmentDeleteApiDto } from '../dtos/department-delete-api.dto';
import { DepartmentFilterApiDto } from '../dtos/department-filter-api.dto';
import { DepartmentResponseApiDto } from '../dtos/department-response-api.dto';

@Service()
export class DepartmentApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(SETTINGS_API_URL);

    readAll(
        dto: DepartmentFilterApiDto,
        page: string,
        options?: FetchOptions
    ): Observable<DepartmentResponseApiDto> {
        const url = `${this.baseUrl}${ADMINISTRATIVE_BOUNDARY_ENDPOINTS.DEPARTMENT}?page=${page}`;
        const params = buildHttpParams(dto);
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<DepartmentResponseApiDto>(url, {
            params,
            context,
        });
    }

    create(dto: DepartmentCreateApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${ADMINISTRATIVE_BOUNDARY_ENDPOINTS.DEPARTMENT}/store`;
        const payload = buildHttpPayload(dto, []);
        return this.http.post<MessageResponseDto>(url, payload);
    }

    update(dto: DepartmentUpdateApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${ADMINISTRATIVE_BOUNDARY_ENDPOINTS.DEPARTMENT}/${dto.id}/update`;
        const payload = buildHttpPayload(dto, ['id']);
        return this.http.post<MessageResponseDto>(url, payload);
    }

    delete(dto: DepartmentDeleteApiDto): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${ADMINISTRATIVE_BOUNDARY_ENDPOINTS.DEPARTMENT}/${dto.uniq_id}/delete`;
        return this.http.delete<MessageResponseDto>(url);
    }
}
