import { ResetPasswordRequestContract } from '../contracts/reset-password-request.contract';
import { ResetPasswordRequestValidateContract } from '../contracts/reset-password-request.validate-contract';
import { validateResetPasswordRequest } from '../validators/reset-password-request.validator';

export function resetPasswordRequestVo(
    contract: ResetPasswordRequestContract
): ResetPasswordRequestValidateContract {
    validateResetPasswordRequest(contract);
    return {
        token: contract.token,
        email: contract.email.trim(),
        password: contract.password,
        confirmPassword: contract.confirmPassword,
    };
}
