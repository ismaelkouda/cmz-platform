import { Service } from '@angular/core';
import { ForgotPasswordResponseEntity } from '@cmz/authentication-domain';
import { SimpleResponseMapper } from '@cmz/shared-data';
import { ForgotPasswordItemApiDto } from '../dtos/forgot-password-response-api.dto';

@Service()
export class ForgotPasswordResponseMapper extends SimpleResponseMapper<
    ForgotPasswordResponseEntity,
    ForgotPasswordItemApiDto
> {
    protected mapItemFromDto(
        dto: ForgotPasswordItemApiDto
    ): ForgotPasswordResponseEntity {
        return new ForgotPasswordResponseEntity({ message: dto.message });
    }
}
