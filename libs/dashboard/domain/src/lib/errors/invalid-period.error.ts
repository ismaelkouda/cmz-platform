import { DomainError } from '@cmz/shared-domain';

/**
 * Équivalent local de `InvalidFilterError` (source, `@shared/domain/errors/
 * filter.error.ts`) — mais alignée sur notre convention `DomainError`
 * (`code`/`messageKey`/`statusCode`, consommée par `ErrorHandlerRegistry`)
 * plutôt que reprendre une classe `Error` nue, incohérente avec le reste du
 * monorepo (cf. `GenericRequiredError`/`TypeRequiredError`).
 */
export class InvalidPeriodError extends DomainError {
    readonly code = 'DASHBOARD_INVALID_PERIOD';
    readonly messageKey = 'DASHBOARD.FILTER.PERIOD.INVALID';
    readonly statusCode = 422;

    constructor(message?: string) {
        super(message ?? 'Invalid period');
    }
}
