import { DomainError } from '@cmz/shared-domain';

export class EmailRequiredError extends DomainError {
    readonly code = 'EMAIL_REQUIRED';
    readonly messageKey = 'COMMON.EMAIL.REQUIRED';
    readonly statusCode = 422;

    constructor(message?: string) {
        super(message ?? 'Email is required');
    }
}
