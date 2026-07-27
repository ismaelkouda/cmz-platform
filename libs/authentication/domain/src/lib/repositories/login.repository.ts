import { Observable } from 'rxjs';
import { LoginRequestValidateContract } from '../contracts/login-request.validate-contract';
import { LoginResponseEntity } from '../entities/login-response.entity';

export abstract class LoginRepository {
    abstract execute(
        validContract: LoginRequestValidateContract
    ): Observable<LoginResponseEntity>;
}
