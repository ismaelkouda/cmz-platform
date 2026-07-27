import { ForgotPasswordRequestValidateContract } from '@cmz/authentication-domain';
import { ForgotPasswordRequestApiDto } from '../dtos/forgot-password-request-api.dto';

export function forgotPasswordRequestMapper(
    validContract: ForgotPasswordRequestValidateContract
): ForgotPasswordRequestApiDto {
    return {
        email: validContract.email,
    };
}
