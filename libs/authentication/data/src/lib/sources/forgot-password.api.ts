import { HttpClient, HttpContext } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { AUTH_API_URL, SKIP_AUTH } from '@cmz/core';
import { Observable } from 'rxjs';
import { AUTHENTICATION_ENDPOINTS } from '../endpoints/authentication.endpoints';
import { ForgotPasswordRequestApiDto } from '../dtos/forgot-password-request-api.dto';
import { ForgotPasswordResponseApiDto } from '../dtos/forgot-password-response-api.dto';

@Service()
export class ForgotPasswordApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(AUTH_API_URL);

    execute(
        dto: ForgotPasswordRequestApiDto
    ): Observable<ForgotPasswordResponseApiDto> {
        const url = `${this.baseUrl}${AUTHENTICATION_ENDPOINTS.FORGOT_PASSWORD}`;
        // Endpoint public : aucun jeton (potentiellement d'une session
        // précédente périmée) ne doit être attaché par `authInterceptor`.
        return this.http.post<ForgotPasswordResponseApiDto>(url, dto, {
            context: new HttpContext().set(SKIP_AUTH, true),
        });
    }
}
