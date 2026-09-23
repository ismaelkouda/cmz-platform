import { DomainError } from '../domain-error.abstract';

/** Backend payload does not satisfy the contract compiled for the client. */
export class InvalidPayloadError extends DomainError {
    readonly code = 'INVALID_PAYLOAD';
    readonly messageKey = 'ERRORS.HTTP.INVALID_PAYLOAD';
    readonly statusCode = 0;

    constructor(path: string, expected: string) {
        super(`Invalid payload at ${path}: expected ${expected}`, {
            path,
            expected,
        });
    }
}
