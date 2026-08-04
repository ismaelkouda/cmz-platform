import { HttpClient, HttpContext } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { AUTH_API_URL, SKIP_AUTH } from '@cmz/core';
import { Observable } from 'rxjs';
import { AUTHENTICATION_ENDPOINTS } from '../endpoints/authentication.endpoints';
import { LoginRequestApiDto } from '../dtos/login-request-api.dto';
import { LoginResponseApiDto } from '../dtos/login-response-api.dto';

@Service()
export class LoginApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(AUTH_API_URL);

    execute(dto: LoginRequestApiDto): Observable<LoginResponseApiDto> {
        const url = `${this.baseUrl}${AUTHENTICATION_ENDPOINTS.LOGIN}`;
        // Endpoint public : aucun jeton (potentiellement d'une session
        // précédente périmée) ne doit être attaché par `authInterceptor`.
        return this.http.post<LoginResponseApiDto>(url, dto, {
            context: new HttpContext().set(SKIP_AUTH, true),
        });
    }
}
