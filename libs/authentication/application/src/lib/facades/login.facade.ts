import { Service, inject } from '@angular/core';
import {
    LoginRequestContract,
    LoginResponseEntity,
} from '@cmz/authentication-domain';
import { ResourceFacade, SessionService } from '@cmz/shared-application';
import { Observable, from, map, switchMap } from 'rxjs';
import { LoginUseCase } from '../use-cases/login.use-case';

/**
 * Seule façade des 3 à écrire la session (décision 4 du plan). L'écriture vit
 * **dans le flux `stream()`**, pas dans un `effect()` séparé sur `value()` :
 * un `effect()` + `SessionService.save()` (async) en fire-and-forget créerait
 * une course (l'UI redirige dès que `value()` est vrai, avant que la session
 * soit réellement écrite) et avalerait silencieusement un échec d'écriture
 * (quota storage, WebCrypto indisponible). En le chaînant ici, `value()` ne
 * devient vrai **qu'après** persistance réussie, et un échec de sauvegarde
 * devient une vraie erreur de flux — routée par `ErrorHandlerRegistry` comme
 * n'importe quelle autre, pas avalée.
 */
@Service()
export class LoginFacade extends ResourceFacade<
    LoginResponseEntity,
    LoginRequestContract
> {
    private readonly useCase = inject(LoginUseCase);
    private readonly session = inject(SessionService);

    protected stream(
        params: LoginRequestContract
    ): Observable<LoginResponseEntity> {
        return this.useCase
            .execute(params)
            .pipe(
                switchMap((entity) =>
                    from(this.session.save(entity.user, entity.token)).pipe(
                        map(() => entity)
                    )
                )
            );
    }

    login(contract: LoginRequestContract): void {
        this.setParams(contract);
    }
}
