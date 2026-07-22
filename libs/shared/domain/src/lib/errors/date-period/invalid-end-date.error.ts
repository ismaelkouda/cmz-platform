import { DomainError } from '../domain-error.abstract';

export class InvalidEndDateError extends DomainError {
    readonly code = 'INVALID_END_DATE';
    readonly messageKey = 'COMMON.INVALID_END_DATE';
    readonly statusCode = 422;

    constructor(message?: string) {
        super(message ?? 'Invalid end date');
    }
}
