import { DomainError } from '../domain-error.abstract';

export class NotFoundError extends DomainError {
    readonly code = 'NOT_FOUND';
    readonly messageKey = 'ERRORS.HTTP.NOT_FOUND';
    readonly statusCode = 404;

    constructor() {
        super('Resource not found');
    }
}
