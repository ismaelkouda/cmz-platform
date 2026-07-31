import { DomainError } from '@cmz/shared-domain';

export class ConfirmPasswordRequiredError extends DomainError {
    readonly code = 'CONFIRM_PASSWORD_REQUIRED';
    readonly messageKey = 'COMMON.CONFIRM_PASSWORD.REQUIRED';
    readonly statusCode = 422;

    constructor(message?: string) {
        super(message ?? 'Confirm password is required');
    }
}
