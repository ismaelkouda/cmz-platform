import { LoginRequestValidateContract } from '@cmz/authentication-domain';
import { LoginRequestApiDto } from '../dtos/login-request-api.dto';

export function loginRequestMapper(
    validContract: LoginRequestValidateContract
): LoginRequestApiDto {
    return {
        email: validContract.email,
        password: validContract.password,
    };
}
