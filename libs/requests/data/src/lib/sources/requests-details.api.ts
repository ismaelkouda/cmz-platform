import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { BYPASS_CACHE, REPORT_API_URL } from '@cmz/core';
import {
    buildFormData,
    buildHttpPayload,
    SimpleResponseDto,
} from '@cmz/shared-data';
import { FetchOptions } from '@cmz/shared-domain';
import { REQUESTS_ENDPOINTS } from '../endpoints/requests.endpoints';
import { RequestsDetailsFilterApiDto } from '../dtos/requests-details-filter-api.dto';
import { RequestsDetailsResponseDto } from '../dtos/requests-details-api.dto';
import { RequestsDetailsTakeApiDto } from '../dtos/requests-details-take-api.dto';
import { RequestsDetailsApproveApiDto } from '../dtos/requests-details-approve-api.dto';
import { RequestsDetailsRejectApiDto } from '../dtos/requests-details-reject-api.dto';

/**
 * Source HTTP fiche demande — alignée legacy `DetailsApi`.
 * GET/POST sur `{reportUrl}requests/{uniq_id}`.
 */
@Service()
export class RequestsDetailsApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = inject(REPORT_API_URL);

    execute(
        filter: RequestsDetailsFilterApiDto,
        options?: FetchOptions
    ): Observable<RequestsDetailsResponseDto> {
        const url = `${this.baseUrl}${REQUESTS_ENDPOINTS.DETAILS_REQUESTS}/${filter.uniq_id}`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<RequestsDetailsResponseDto>(url, { context });
    }

    take(
        apiDto: RequestsDetailsTakeApiDto
    ): Observable<SimpleResponseDto<void>> {
        const url = `${this.baseUrl}${REQUESTS_ENDPOINTS.DETAILS_REQUESTS}/${apiDto.uniq_id}/take`;
        const payload = buildHttpPayload(apiDto, ['uniq_id']);
        return this.http.post<SimpleResponseDto<void>>(url, payload);
    }

    approve(
        apiDto: RequestsDetailsApproveApiDto
    ): Observable<SimpleResponseDto<void>> {
        const url = `${this.baseUrl}${REQUESTS_ENDPOINTS.DETAILS_REQUESTS}/${apiDto.uniq_id}/approve`;
        const payload = buildHttpPayload(apiDto, ['uniq_id']);
        const formData = buildFormData(payload);
        return this.http.post<SimpleResponseDto<void>>(url, formData);
    }

    reject(
        apiDto: RequestsDetailsRejectApiDto
    ): Observable<SimpleResponseDto<void>> {
        const url = `${this.baseUrl}${REQUESTS_ENDPOINTS.DETAILS_REQUESTS}/${apiDto.uniq_id}/reject`;
        const payload = buildHttpPayload(apiDto, ['uniq_id']);
        return this.http.post<SimpleResponseDto<void>>(url, payload);
    }
}
