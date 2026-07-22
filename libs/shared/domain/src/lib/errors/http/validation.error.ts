import { DomainError } from '../domain-error.abstract';

export class ValidationError extends DomainError {
    readonly code = 'VALIDATION_ERROR';
    readonly messageKey = 'ERRORS.HTTP.VALIDATION';
    readonly statusCode = 422;

    constructor(message?: string) {
        super(message ?? 'Validation failed');
    }
}
