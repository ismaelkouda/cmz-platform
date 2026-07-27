import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { AUTH_API_URL } from '@cmz/core';
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
        return this.http.post<ForgotPasswordResponseApiDto>(url, dto);
    }
}
