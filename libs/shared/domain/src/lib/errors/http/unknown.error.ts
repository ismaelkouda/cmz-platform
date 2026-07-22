import { DomainError } from '../domain-error.abstract';

export class UnknownError extends DomainError {
    readonly code = 'UNKNOWN_ERROR';
    readonly messageKey = 'ERRORS.HTTP.UNKNOWN';
    readonly statusCode = 0;

    constructor() {
        super('Connexion error');
    }
}
