import { DomainError } from '../domain-error.abstract';

export class TypeRequiredError extends DomainError {
    readonly code = 'TYPE_REQUIRED';
    readonly messageKey = 'COMMON.TYPE.REQUIRED';
    readonly statusCode = 422;

    constructor(message?: string) {
        super(message ?? 'Type is required');
    }
}
