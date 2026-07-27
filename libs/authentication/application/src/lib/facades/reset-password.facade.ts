import { Service, inject } from '@angular/core';
import {
    ResetPasswordRequestContract,
    ResetPasswordResponseEntity,
} from '@cmz/authentication-domain';
import { ResourceFacade } from '@cmz/shared-application';
import { Observable } from 'rxjs';
import { ResetPasswordUseCase } from '../use-cases/reset-password.use-case';

@Service()
export class ResetPasswordFacade extends ResourceFacade<
    ResetPasswordResponseEntity,
    ResetPasswordRequestContract
> {
    private readonly useCase = inject(ResetPasswordUseCase);

    protected stream(
        params: ResetPasswordRequestContract
    ): Observable<ResetPasswordResponseEntity> {
        return this.useCase.execute(params);
    }

    submit(contract: ResetPasswordRequestContract): void {
        this.setParams(contract);
    }
}
