import { HttpClient, HttpContext } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { AUTH_API_URL, BYPASS_CACHE } from '@cmz/core';
import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { COMMUNICATION_ENDPOINTS } from '../endpoints/communication.endpoints';
import { MessagingFindOneFilterApiDto } from '../dtos/messaging-find-one-filter-api.dto';
import { MessagingFindOneResponseApiDto } from '../dtos/messaging-find-one-response-api.dto';

@Service()
export class MessagingFindOneApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(AUTH_API_URL);

    execute(
        dto: MessagingFindOneFilterApiDto,
        options?: FetchOptions
    ): Observable<MessagingFindOneResponseApiDto> {
        const url = `${this.baseUrl}${COMMUNICATION_ENDPOINTS.MESSAGING}/${dto.id}`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<MessagingFindOneResponseApiDto>(url, {
            context,
        });
    }
}
