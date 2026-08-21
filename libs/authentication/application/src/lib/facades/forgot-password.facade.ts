import { Service, inject } from '@angular/core';
import {
    ForgotPasswordRequestContract,
    ForgotPasswordResponseEntity,
} from '@cmz/authentication-domain';
import { ResourceFacade } from '@cmz/shared-application';
import { Observable } from 'rxjs';
import { ForgotPasswordUseCase } from '../use-cases/forgot-password.use-case';

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginFacade`. */
@Service({ autoProvided: false })
export class ForgotPasswordFacade extends ResourceFacade<
    ForgotPasswordResponseEntity,
    ForgotPasswordRequestContract
> {
    private readonly useCase = inject(ForgotPasswordUseCase);

    protected stream(
        params: ForgotPasswordRequestContract
    ): Observable<ForgotPasswordResponseEntity> {
        return this.useCase.execute(params);
    }

    requestPasswordReset(contract: ForgotPasswordRequestContract): void {
        this.setParams(contract);
    }
}
