import { HttpClient, HttpContext } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { AUTH_API_URL, SKIP_AUTH } from '@cmz/core';
import { Observable } from 'rxjs';
import { AUTHENTICATION_ENDPOINTS } from '../endpoints/authentication.endpoints';
import { ResetPasswordRequestApiDto } from '../dtos/reset-password-request-api.dto';
import { ResetPasswordResponseApiDto } from '../dtos/reset-password-response-api.dto';

@Service()
export class ResetPasswordApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(AUTH_API_URL);

    execute(
        dto: ResetPasswordRequestApiDto
    ): Observable<ResetPasswordResponseApiDto> {
        const url = `${this.baseUrl}${AUTHENTICATION_ENDPOINTS.RESET_PASSWORD}`;
        // Endpoint public : aucun jeton (potentiellement d'une session
        // précédente périmée) ne doit être attaché par `authInterceptor`.
        return this.http.post<ResetPasswordResponseApiDto>(url, dto, {
            context: new HttpContext().set(SKIP_AUTH, true),
        });
    }
}
