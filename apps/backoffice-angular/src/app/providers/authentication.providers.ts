import { Provider } from '@angular/core';
import {
    ForgotPasswordRepository,
    LoginRepository,
    ResetPasswordRepository,
} from '@cmz/authentication-domain';
import {
    ForgotPasswordRepositoryImpl,
    LoginRepositoryImpl,
    ResetPasswordRepositoryImpl,
} from '@cmz/authentication-data';

/**
 * Composition root du module `authentication` : wire les ports domaine à
 * leurs implémentations `data`. À fournir au niveau app (`app.config`) — les
 * façades/use-cases sont des singletons root (même convention que
 * `administrative-boundary`/`administrative-infrastructure`).
 */
export function provideAuthentication(): Provider[] {
    return [
        { provide: LoginRepository, useClass: LoginRepositoryImpl },
        {
            provide: ForgotPasswordRepository,
            useClass: ForgotPasswordRepositoryImpl,
        },
        {
            provide: ResetPasswordRepository,
            useClass: ResetPasswordRepositoryImpl,
        },
    ];
}
