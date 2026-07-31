import { DomainError } from '@cmz/shared-domain';

export class ConfirmPasswordNoMatchError extends DomainError {
    readonly code = 'CONFIRM_PASSWORD_NO_MATCH';
    readonly messageKey = 'COMMON.CONFIRM_PASSWORD.NO_MATCH';
    readonly statusCode = 422;

    constructor(message?: string) {
        super(message ?? 'Confirm password no match password');
    }
}
