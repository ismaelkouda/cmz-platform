import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { BYPASS_CACHE, REPORT_API_URL } from '@cmz/core';
import { buildHttpPayload, SimpleResponseDto } from '@cmz/shared-data';
import { FetchOptions } from '@cmz/shared-domain';
import { ProcessingDetailsFilterApiDto } from '../dtos/processing-details-filter-api.dto';
import { ProcessingDetailsResponseDto } from '../dtos/processing-details-api.dto';
import { ProcessingDetailsTakeApiDto } from '../dtos/processing-details-take-api.dto';
import { ProcessingDetailsTreatApiDto } from '../dtos/processing-details-treat-api.dto';

/**
 * Source HTTP fiche signalement — alignée legacy `DetailsApi`.
 * GET/POST sur `{reportUrl}{uniq_id}` (sans segment module intermédiaire).
 */
@Service()
export class ProcessingDetailsApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = inject(REPORT_API_URL);

    execute(
        filter: ProcessingDetailsFilterApiDto,
        options?: FetchOptions
    ): Observable<ProcessingDetailsResponseDto> {
        const url = `${this.baseUrl}${filter.uniq_id}`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<ProcessingDetailsResponseDto>(url, { context });
    }

    take(
        apiDto: ProcessingDetailsTakeApiDto
    ): Observable<SimpleResponseDto<void>> {
        const url = `${this.baseUrl}${apiDto.uniq_id}/take`;
        const payload = buildHttpPayload(apiDto, ['uniq_id']);
        return this.http.post<SimpleResponseDto<void>>(url, payload);
    }

    treat(
        apiDto: ProcessingDetailsTreatApiDto
    ): Observable<SimpleResponseDto<void>> {
        const url = `${this.baseUrl}${apiDto.uniq_id}/process`;
        const payload = buildHttpPayload(apiDto, ['uniq_id']);
        return this.http.post<SimpleResponseDto<void>>(url, payload);
    }
}
