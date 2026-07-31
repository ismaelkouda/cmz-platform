import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { BYPASS_CACHE, REPORT_API_URL } from '@cmz/core';
import { buildHttpPayload, SimpleResponseDto } from '@cmz/shared-data';
import { FetchOptions } from '@cmz/shared-domain';
import { FINALIZATION_ENDPOINTS } from '../endpoints/finalization.endpoints';
import { FinalizationDetailsFilterApiDto } from '../dtos/finalization-details-filter-api.dto';
import { FinalizationDetailsResponseDto } from '../dtos/finalization-details-api.dto';
import { FinalizationDetailsTakeApiDto } from '../dtos/finalization-details-take-api.dto';
import { FinalizationDetailsFinalizeApiDto } from '../dtos/finalization-details-finalize-api.dto';

/** Source HTTP fiche finalization — legacy `DetailsApi`. */
@Service()
export class FinalizationDetailsApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = inject(REPORT_API_URL);

    execute(
        filter: FinalizationDetailsFilterApiDto,
        options?: FetchOptions
    ): Observable<FinalizationDetailsResponseDto> {
        const url = `${this.baseUrl}${filter.uniq_id}`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<FinalizationDetailsResponseDto>(url, { context });
    }

    take(
        apiDto: FinalizationDetailsTakeApiDto
    ): Observable<SimpleResponseDto<void>> {
        const url = `${this.baseUrl}${FINALIZATION_ENDPOINTS.DETAILS_REPORTS}/${apiDto.uniq_id}/take`;
        const payload = buildHttpPayload(apiDto, ['uniq_id']);
        return this.http.post<SimpleResponseDto<void>>(url, payload);
    }

    finalize(
        apiDto: FinalizationDetailsFinalizeApiDto
    ): Observable<SimpleResponseDto<void>> {
        const url = `${this.baseUrl}${apiDto.uniq_id}/finalize`;
        const payload = buildHttpPayload(apiDto, ['uniq_id']);
        return this.http.post<SimpleResponseDto<void>>(url, payload);
    }
}
