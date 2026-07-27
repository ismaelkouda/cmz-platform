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
import { COVERAGE_AREAS_ENDPOINTS } from '../endpoints/coverage-areas.endpoints';
import { OpticalFiberNetworkCreateApiDto } from '../dtos/optical-fiber-network-create-api.dto';
import { OpticalFiberNetworkUpdateApiDto } from '../dtos/optical-fiber-network-update-api.dto';
import { OpticalFiberNetworkDeleteApiDto } from '../dtos/optical-fiber-network-delete-api.dto';
import { OpticalFiberNetworkFilterApiDto } from '../dtos/optical-fiber-network-filter-api.dto';
import { OpticalFiberNetworkResponseApiDto } from '../dtos/optical-fiber-network-response-api.dto';
import { OpticalFiberNetworkEnableApiDto } from '../dtos/optical-fiber-network-enable-api.dto';
import { OpticalFiberNetworkDisableApiDto } from '../dtos/optical-fiber-network-disable-api.dto';

/**
 * `create`/`update` envoient un `FormData` (`multipart/form-data`), pas du
 * JSON — seul endpoint du domaine `coverage-areas` avec upload de fichier
 * (`geom_file`, le tracé GeoJSON de la fibre). Cf. `buildFormData`
 * (`@cmz/shared-data`), ajouté pour ce module.
 */
@Service()
export class OpticalFiberNetworkApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(SETTINGS_API_URL);

    readAll(
        dto: OpticalFiberNetworkFilterApiDto,
        page: string,
        options?: FetchOptions
    ): Observable<OpticalFiberNetworkResponseApiDto> {
        const url = `${this.baseUrl}${COVERAGE_AREAS_ENDPOINTS.OPTICAL_FIBER_NETWORK}?page=${page}`;
        const params = buildHttpParams(dto);
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<OpticalFiberNetworkResponseApiDto>(url, {
            params,
            context,
        });
    }

    create(
        dto: OpticalFiberNetworkCreateApiDto
    ): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${COVERAGE_AREAS_ENDPOINTS.OPTICAL_FIBER_NETWORK}/store`;
        const formData = buildFormData({ ...dto });
        return this.http.post<MessageResponseDto>(url, formData);
    }

    update(
        dto: OpticalFiberNetworkUpdateApiDto
    ): Observable<MessageResponseDto> {
        const { id, ...rest } = dto;
        const url = `${this.baseUrl}${COVERAGE_AREAS_ENDPOINTS.OPTICAL_FIBER_NETWORK}/${id}/update`;
        const formData = buildFormData({ ...rest });
        return this.http.post<MessageResponseDto>(url, formData);
    }

    delete(
        dto: OpticalFiberNetworkDeleteApiDto
    ): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${COVERAGE_AREAS_ENDPOINTS.OPTICAL_FIBER_NETWORK}/${dto.uniq_id}/delete`;
        return this.http.delete<MessageResponseDto>(url);
    }

    enable(
        dto: OpticalFiberNetworkEnableApiDto
    ): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${COVERAGE_AREAS_ENDPOINTS.OPTICAL_FIBER_NETWORK}/${dto.uniq_id}/enable`;
        return this.http.put<MessageResponseDto>(url, {});
    }

    disable(
        dto: OpticalFiberNetworkDisableApiDto
    ): Observable<MessageResponseDto> {
        const url = `${this.baseUrl}${COVERAGE_AREAS_ENDPOINTS.OPTICAL_FIBER_NETWORK}/${dto.uniq_id}/disable`;
        return this.http.put<MessageResponseDto>(url, {});
    }
}
