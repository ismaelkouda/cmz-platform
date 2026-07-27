import { Service, inject } from '@angular/core';
import {
    ForgotPasswordRepository,
    ForgotPasswordRequestValidateContract,
    ForgotPasswordResponseEntity,
} from '@cmz/authentication-domain';
import { Observable, map } from 'rxjs';
import { ForgotPasswordApi } from '../sources/forgot-password.api';
import { ForgotPasswordResponseMapper } from '../mappers/forgot-password-response.mapper';
import { forgotPasswordRequestMapper } from '../mappers/forgot-password-request.mapper';

@Service()
export class ForgotPasswordRepositoryImpl implements ForgotPasswordRepository {
    private readonly api = inject(ForgotPasswordApi);
    private readonly mapper = inject(ForgotPasswordResponseMapper);

    execute(
        validContract: ForgotPasswordRequestValidateContract
    ): Observable<ForgotPasswordResponseEntity> {
        const dto = forgotPasswordRequestMapper(validContract);
        return this.api
            .execute(dto)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
