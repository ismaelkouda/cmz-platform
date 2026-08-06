import { HttpClient, HttpContext } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { AUTH_API_URL, BYPASS_CACHE } from '@cmz/core';
import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { COMMUNICATION_ENDPOINTS } from '../endpoints/communication.endpoints';
import { MessagingSelectResponseApiDto } from '../dtos/messaging-select-response-api.dto';

/**
 * `AUTH_API_URL` (pas `SETTINGS_API_URL`) — même base que `MessagingApi`,
 * cf. le commentaire de `communication.endpoints.ts`.
 */
@Service()
export class MessagingSelectApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(AUTH_API_URL);

    readAll(options?: FetchOptions): Observable<MessagingSelectResponseApiDto> {
        const url = `${this.baseUrl}${COMMUNICATION_ENDPOINTS.MESSAGING}`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<MessagingSelectResponseApiDto>(url, {
            context,
        });
    }
}
