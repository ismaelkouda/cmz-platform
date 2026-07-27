import { Service, inject } from '@angular/core';
import {
    LoginRepository,
    LoginRequestContract,
    LoginResponseEntity,
    loginRequestVo,
} from '@cmz/authentication-domain';
import { Observable, defer } from 'rxjs';

@Service()
export class LoginUseCase {
    private readonly repository = inject(LoginRepository);

    execute(contract: LoginRequestContract): Observable<LoginResponseEntity> {
        return defer(() => this.repository.execute(loginRequestVo(contract)));
    }
}
