import { Service, inject } from '@angular/core';
import {
    ForgotPasswordRepository,
    ForgotPasswordRequestContract,
    ForgotPasswordResponseEntity,
    forgotPasswordRequestVo,
} from '@cmz/authentication-domain';
import { Observable, defer } from 'rxjs';

@Service()
export class ForgotPasswordUseCase {
    private readonly repository = inject(ForgotPasswordRepository);

    execute(
        contract: ForgotPasswordRequestContract
    ): Observable<ForgotPasswordResponseEntity> {
        return defer(() =>
            this.repository.execute(forgotPasswordRequestVo(contract))
        );
    }
}
