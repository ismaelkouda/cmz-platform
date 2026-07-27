import { ForgotPasswordRequestContract } from '../contracts/forgot-password-request.contract';
import { ForgotPasswordRequestValidateContract } from '../contracts/forgot-password-request.validate-contract';
import { validateForgotPasswordRequest } from '../validators/forgot-password-request.validator';

export function forgotPasswordRequestVo(
    contract: ForgotPasswordRequestContract
): ForgotPasswordRequestValidateContract {
    validateForgotPasswordRequest(contract);
    return {
        email: contract.email.trim(),
    };
}
