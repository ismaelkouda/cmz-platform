import { Service, inject } from '@angular/core';
import {
    LoginRepository,
    LoginRequestValidateContract,
    LoginResponseEntity,
} from '@cmz/authentication-domain';
import { Observable, map } from 'rxjs';
import { LoginApi } from '../sources/login.api';
import { LoginResponseMapper } from '../mappers/login-response.mapper';
import { loginRequestMapper } from '../mappers/login-request.mapper';

@Service()
export class LoginRepositoryImpl implements LoginRepository {
    private readonly api = inject(LoginApi);
    private readonly mapper = inject(LoginResponseMapper);

    execute(
        validContract: LoginRequestValidateContract
    ): Observable<LoginResponseEntity> {
        const dto = loginRequestMapper(validContract);
        return this.api
            .execute(dto)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
