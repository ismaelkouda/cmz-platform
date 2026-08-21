import { Service, inject } from '@angular/core';
import {
    LoginRepository,
    LoginRequestContract,
    LoginResponseEntity,
    loginRequestVo,
} from '@cmz/authentication-domain';
import { Observable, defer } from 'rxjs';

/**
 * `autoProvided: false` (OPS-25bis, 2026-08-21) : depuis la migration
 * lazy-provider (`app.routes.ts`), `LoginRepository` n'est plus dans
 * l'injecteur racine — il n'est fourni que dans l'injecteur enfant créé par
 * `providers` de la route `/auth` (voir `providers/authentication.providers.ts`).
 * Un `@Service()` sans option reste `autoProvided: true` (singleton racine,
 * doc angular.dev/guide/di/creating-and-using-services) : son premier
 * `inject()` résoudrait `LoginRepository` depuis l'injecteur RACINE, où le
 * token n'existe plus → `NullInjectorError` synchrone au bootstrap du
 * composant (root cause du crash E2E "login form jamais visible", confirmé
 * en CI après la généralisation OPS-25 — voir taches-restantes.md).
 * `autoProvided: false` (méthode recommandée par
 * angular.dev/guide/di/creating-and-using-services#opting-out-of-automatic-provisioning
 * pour scoper un service "to a specific route or component") force la
 * résolution dans l'injecteur de la route où `provideAuthentication()` fournit
 * ce `LoginUseCase` explicitement, aux côtés de `LoginRepository`.
 */
@Service({ autoProvided: false })
export class LoginUseCase {
    private readonly repository = inject(LoginRepository);

    execute(contract: LoginRequestContract): Observable<LoginResponseEntity> {
        return defer(() => this.repository.execute(loginRequestVo(contract)));
    }
}
