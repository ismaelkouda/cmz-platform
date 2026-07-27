import {
    EmailRequiredError,
    InvalidEmailError,
    PasswordRequiredError,
    isValidEmail,
} from '@cmz/shared-domain';
import { LoginRequestContract } from '../contracts/login-request.contract';
import { LoginRequestValidateContract } from '../contracts/login-request.validate-contract';

export function validateLoginRequest(
    contract: LoginRequestContract
): asserts contract is LoginRequestValidateContract {
    if (!contract.email?.trim()) {
        throw new EmailRequiredError();
    }
    if (!isValidEmail(contract.email.trim())) {
        throw new InvalidEmailError();
    }
    if (!contract.password) {
        throw new PasswordRequiredError();
    }
}
