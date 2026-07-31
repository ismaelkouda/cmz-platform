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
import { REPORT_STATES_ENDPOINTS } from '../endpoints/report-states.endpoints';
import { ReportStatesDetailsFilterApiDto } from '../dtos/report-states-details-filter-api.dto';
import { ReportStatesDetailsResponseDto } from '../dtos/report-states-details-api.dto';
import { ReportStatesDetailsTakeApiDto } from '../dtos/report-states-details-take-api.dto';
import { ReportStatesDetailsApproveApiDto } from '../dtos/report-states-details-approve-api.dto';
import { ReportStatesDetailsRejectApiDto } from '../dtos/report-states-details-reject-api.dto';

/**
 * Source HTTP fiche demande — alignée legacy `DetailsApi`.
 * GET/POST sur `{reportUrl}report-states/{uniq_id}`.
 */
@Service()
export class ReportStatesDetailsApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = inject(REPORT_API_URL);

    execute(
        filter: ReportStatesDetailsFilterApiDto,
        options?: FetchOptions
    ): Observable<ReportStatesDetailsResponseDto> {
        const url = `${this.baseUrl}${REPORT_STATES_ENDPOINTS.DETAILS_REPORT_STATES}/${filter.uniq_id}`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<ReportStatesDetailsResponseDto>(url, { context });
    }

    take(
        apiDto: ReportStatesDetailsTakeApiDto
    ): Observable<SimpleResponseDto<void>> {
        const url = `${this.baseUrl}${REPORT_STATES_ENDPOINTS.DETAILS_REPORT_STATES}/${apiDto.uniq_id}/take`;
        const payload = buildHttpPayload(apiDto, ['uniq_id']);
        return this.http.post<SimpleResponseDto<void>>(url, payload);
    }

    approve(
        apiDto: ReportStatesDetailsApproveApiDto
    ): Observable<SimpleResponseDto<void>> {
        const url = `${this.baseUrl}${REPORT_STATES_ENDPOINTS.DETAILS_REPORT_STATES}/${apiDto.uniq_id}/approve`;
        const payload = buildHttpPayload(apiDto, ['uniq_id']);
        const formData = buildFormData(payload);
        return this.http.post<SimpleResponseDto<void>>(url, formData);
    }

    reject(
        apiDto: ReportStatesDetailsRejectApiDto
    ): Observable<SimpleResponseDto<void>> {
        const url = `${this.baseUrl}${REPORT_STATES_ENDPOINTS.DETAILS_REPORT_STATES}/${apiDto.uniq_id}/reject`;
        const payload = buildHttpPayload(apiDto, ['uniq_id']);
        return this.http.post<SimpleResponseDto<void>>(url, payload);
    }
}
