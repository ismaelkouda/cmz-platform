import { DomainError } from '@cmz/shared-domain';

export class InvalidEmailError extends DomainError {
    readonly code = 'INVALID_EMAIL';
    readonly messageKey = 'COMMON.EMAIL.INVALID_FORMAT';
    readonly statusCode = 422;

    constructor(message?: string) {
        super(message ?? 'Invalid email format');
    }
}
