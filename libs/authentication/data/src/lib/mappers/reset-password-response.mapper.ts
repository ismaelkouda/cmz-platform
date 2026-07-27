import { Service } from '@angular/core';
import { ResetPasswordResponseEntity } from '@cmz/authentication-domain';
import { SimpleResponseMapper } from '@cmz/shared-data';
import { ResetPasswordItemApiDto } from '../dtos/reset-password-response-api.dto';

@Service()
export class ResetPasswordResponseMapper extends SimpleResponseMapper<
    ResetPasswordResponseEntity,
    ResetPasswordItemApiDto
> {
    protected mapItemFromDto(
        dto: ResetPasswordItemApiDto
    ): ResetPasswordResponseEntity {
        return new ResetPasswordResponseEntity({ message: dto.message });
    }
}
