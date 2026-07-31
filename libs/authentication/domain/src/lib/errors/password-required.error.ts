import { DomainError } from '@cmz/shared-domain';

export class PasswordRequiredError extends DomainError {
    readonly code = 'PASSWORD_REQUIRED';
    readonly messageKey = 'COMMON.PASSWORD.REQUIRED';
    readonly statusCode = 422;

    constructor(message?: string) {
        super(message ?? 'Password is required');
    }
}
