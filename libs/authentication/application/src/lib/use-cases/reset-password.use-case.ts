import { Service, inject } from '@angular/core';
import {
    ResetPasswordRepository,
    ResetPasswordRequestContract,
    ResetPasswordResponseEntity,
    resetPasswordRequestVo,
} from '@cmz/authentication-domain';
import { Observable, defer } from 'rxjs';

@Service()
export class ResetPasswordUseCase {
    private readonly repository = inject(ResetPasswordRepository);

    execute(
        contract: ResetPasswordRequestContract
    ): Observable<ResetPasswordResponseEntity> {
        return defer(() =>
            this.repository.execute(resetPasswordRequestVo(contract))
        );
    }
}
