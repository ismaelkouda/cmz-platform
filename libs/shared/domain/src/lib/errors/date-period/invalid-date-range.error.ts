import { DomainError } from '../domain-error.abstract';

export class InvalidDateRangeError extends DomainError {
    readonly code = 'INVALID_DATE_RANGE';
    readonly messageKey = 'COMMON.INVALID_DATE_RANGE';
    readonly statusCode = 422;

    constructor(message?: string) {
        super(message ?? 'Invalid date range');
    }
}
