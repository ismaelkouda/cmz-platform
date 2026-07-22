import { DomainError } from '../domain-error.abstract';

export class InvalidStartDateError extends DomainError {
    readonly code = 'INVALID_START_DATE';
    readonly messageKey = 'COMMON.INVALID_START_DATE';
    readonly statusCode = 422;

    constructor(message?: string) {
        super(message ?? 'Invalid start date');
    }
}
