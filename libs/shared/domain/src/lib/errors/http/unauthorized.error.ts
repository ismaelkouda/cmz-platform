import { DomainError } from '../domain-error.abstract';

export class UnauthorizedError extends DomainError {
    readonly code = 'UNAUTHORIZED';
    readonly messageKey = 'COMMON.ERROR.UNAUTHORIZED';
    readonly statusCode = 401;

    constructor() {
        super('Unauthorized');
    }
}
