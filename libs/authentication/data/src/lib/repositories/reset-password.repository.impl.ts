import { Service, inject } from '@angular/core';
import {
    ResetPasswordRepository,
    ResetPasswordRequestValidateContract,
    ResetPasswordResponseEntity,
} from '@cmz/authentication-domain';
import { Observable, map } from 'rxjs';
import { ResetPasswordApi } from '../sources/reset-password.api';
import { ResetPasswordResponseMapper } from '../mappers/reset-password-response.mapper';
import { resetPasswordRequestMapper } from '../mappers/reset-password-request.mapper';

@Service()
export class ResetPasswordRepositoryImpl implements ResetPasswordRepository {
    private readonly api = inject(ResetPasswordApi);
    private readonly mapper = inject(ResetPasswordResponseMapper);

    execute(
        validContract: ResetPasswordRequestValidateContract
    ): Observable<ResetPasswordResponseEntity> {
        const dto = resetPasswordRequestMapper(validContract);
        return this.api
            .execute(dto)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
