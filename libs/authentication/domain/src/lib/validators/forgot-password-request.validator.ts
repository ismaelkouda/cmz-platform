import {
    EmailRequiredError,
    InvalidEmailError,
    isValidEmail,
} from '@cmz/shared-domain';
import { ForgotPasswordRequestContract } from '../contracts/forgot-password-request.contract';
import { ForgotPasswordRequestValidateContract } from '../contracts/forgot-password-request.validate-contract';

export function validateForgotPasswordRequest(
    contract: ForgotPasswordRequestContract
): asserts contract is ForgotPasswordRequestValidateContract {
    if (!contract.email?.trim()) {
        throw new EmailRequiredError();
    }
    if (!isValidEmail(contract.email.trim())) {
        throw new InvalidEmailError();
    }
}
