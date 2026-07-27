import { Service, effect, inject } from '@angular/core';
import {
    LoginRequestContract,
    LoginResponseEntity,
} from '@cmz/authentication-domain';
import { ResourceFacade, SessionService } from '@cmz/shared-application';
import { Observable } from 'rxjs';
import { LoginUseCase } from '../use-cases/login.use-case';

/**
 * Seule façade des 3 à écrire la session (décision 4 du plan) : un `effect()`
 * réagit à `value()` et appelle `SessionService.save()` au succès — c'est ici,
 * pas dans l'UI, que ce côté-effet vit (l'UI ne fait que naviguer).
 */
@Service()
export class LoginFacade extends ResourceFacade<
    LoginResponseEntity,
    LoginRequestContract
> {
    private readonly useCase = inject(LoginUseCase);
    private readonly session = inject(SessionService);

    constructor() {
        super();
        effect(() => {
            const response = this.value();
            if (response) {
                void this.session.save(response.user, response.token);
            }
        });
    }

    protected stream(
        params: LoginRequestContract
    ): Observable<LoginResponseEntity> {
        return this.useCase.execute(params);
    }

    submit(contract: LoginRequestContract): void {
        this.setParams(contract);
    }
}
