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
import {
    ForgotPasswordFacade,
    ForgotPasswordUseCase,
    LoginFacade,
    LoginUseCase,
    ResetPasswordFacade,
    ResetPasswordUseCase,
} from '@cmz/authentication-application';

/**
 * Composition root du module `authentication` : wire les ports domaine à
 * leurs implémentations `data`, scopée à l'injecteur de la route `/auth`
 * (`app.routes.ts`, `loadChildren`).
 *
 * OPS-25bis (2026-08-21) : le docstring précédent affirmait « les
 * façades/use-cases sont des singletons root » — c'était vrai avant la
 * migration lazy-provider OPS-25, mais devenu FAUX et non corrigé après elle
 * (root cause du crash E2E "login form jamais visible", `NullInjectorError`
 * synchrone : `LoginFacade`/`LoginUseCase` restaient `@Service()` = singleton
 * racine, et cherchaient `LoginRepository` dans l'injecteur racine où il
 * n'existe plus depuis que ce fichier n'est plus importé statiquement dans
 * `app.config.ts`). Corrigé en 2 temps, qui doivent rester synchronisés :
 * 1. Chaque `XxxUseCase`/`XxxFacade` est passé à
 *    `@Service({ autoProvided: false })` (méthode recommandée par
 *    angular.dev/guide/di/creating-and-using-services#opting-out-of-automatic-provisioning
 *    pour scoper un service à une route) — voir leurs docstrings respectifs.
 * 2. Ils sont fournis explicitement ci-dessous, dans le même injecteur que
 *    leur `Repository`, pour que toute la chaîne Facade → UseCase →
 *    Repository résolve dans l'injecteur enfant de la route `/auth`, jamais
 *    dans le root.
 *
 * `administrative-boundary` reste la seule exception fournie au niveau app
 * (cross-module réel, voir `app.config.ts`) — tous les autres modules migrés
 * OPS-25 partagent potentiellement le même bug latent que celui-ci s'ils
 * n'ont pas reçu le même correctif (voir taches-restantes.md, OPS-25bis).
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
        LoginUseCase,
        ForgotPasswordUseCase,
        ResetPasswordUseCase,
        LoginFacade,
        ForgotPasswordFacade,
        ResetPasswordFacade,
    ];
}
