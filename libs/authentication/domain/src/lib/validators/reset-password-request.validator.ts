import { GenericRequiredError } from '@cmz/shared-domain';
import { ConfirmPasswordNoMatchError } from '../errors/confirm-password.error';
import { ConfirmPasswordRequiredError } from '../errors/confirm-password-required.error';
import { EmailRequiredError } from '../errors/email-required.error';
import { InvalidEmailError } from '../errors/invalid-email.error';
import { PasswordRequiredError } from '../errors/password-required.error';
import { isMatchConfirmPassword } from '../utils/match-confirm-password.util';
import { isValidEmail } from '../utils/valid-email.util';
import { ResetPasswordRequestContract } from '../contracts/reset-password-request.contract';
import { ResetPasswordRequestValidateContract } from '../contracts/reset-password-request.validate-contract';

export function validateResetPasswordRequest(
    contract: ResetPasswordRequestContract
): asserts contract is ResetPasswordRequestValidateContract {
    if (!contract.token) {
        throw new GenericRequiredError(
            'AUTHENTICATION.RESET_PASSWORD.FORM.ERROR.TOKEN_REQUIRE'
        );
    }
    if (!contract.email?.trim()) {
        throw new EmailRequiredError();
    }
    if (!isValidEmail(contract.email.trim())) {
        throw new InvalidEmailError();
    }
    if (!contract.password) {
        throw new PasswordRequiredError();
    }
    if (!contract.confirmPassword) {
        throw new ConfirmPasswordRequiredError();
    }
    if (!isMatchConfirmPassword(contract.password, contract.confirmPassword)) {
        throw new ConfirmPasswordNoMatchError();
    }
}
