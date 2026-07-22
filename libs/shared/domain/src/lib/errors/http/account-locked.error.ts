import { DomainError } from '../domain-error.abstract';

export class AccountLockedError extends DomainError {
    readonly code = 'ACCOUNT_LOCKED';
    readonly messageKey = 'ERRORS.AUTH.ACCOUNT_LOCKED';
    readonly statusCode = 400;

    constructor(message?: string) {
        super(message ?? 'Account locked');
    }
}
