import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { AUTH_API_URL } from '@cmz/core';
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
        return this.http.post<LoginResponseApiDto>(url, dto);
    }
}
