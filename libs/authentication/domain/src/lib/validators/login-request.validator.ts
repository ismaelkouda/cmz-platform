import { EmailRequiredError } from '../errors/email-required.error';
import { InvalidEmailError } from '../errors/invalid-email.error';
import { PasswordRequiredError } from '../errors/password-required.error';
import { isValidEmail } from '../utils/valid-email.util';
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
