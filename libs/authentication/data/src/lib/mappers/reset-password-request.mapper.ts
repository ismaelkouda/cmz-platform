import { ResetPasswordRequestValidateContract } from '@cmz/authentication-domain';
import { ResetPasswordRequestApiDto } from '../dtos/reset-password-request-api.dto';

export function resetPasswordRequestMapper(
    validContract: ResetPasswordRequestValidateContract
): ResetPasswordRequestApiDto {
    return {
        token: validContract.token,
        email: validContract.email,
        password: validContract.password,
        confirmPassword: validContract.confirmPassword,
    };
}
