import {
    ConfirmPasswordNoMatchError,
    ConfirmPasswordRequiredError,
    EmailRequiredError,
    GenericRequiredError,
    InvalidEmailError,
    PasswordRequiredError,
    isMatchConfirmPassword,
    isValidEmail,
} from '@cmz/shared-domain';
import { ResetPasswordRequestContract } from '../contracts/reset-password-request.contract';
import { ResetPasswordRequestValidateContract } from '../contracts/reset-password-request.validate-contract';

/**
 * `token` n'a pas de type kernel dédié (propre à ce flux) → `GenericRequiredError`,
 * seul champ dans ce cas (décision 6 du plan). `email`/`password`/
 * `confirmPassword` réutilisent les types kernel déjà posés — appliqués ici de
 * façon uniforme même si le source n'utilisait `EmailRequiredError` que pour
 * `login` (incohérence mineure du source, pas reproduite).
 */
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
