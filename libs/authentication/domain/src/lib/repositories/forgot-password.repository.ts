import { Observable } from 'rxjs';
import { ForgotPasswordRequestValidateContract } from '../contracts/forgot-password-request.validate-contract';
import { ForgotPasswordResponseEntity } from '../entities/forgot-password-response.entity';

export abstract class ForgotPasswordRepository {
    abstract execute(
        validContract: ForgotPasswordRequestValidateContract
    ): Observable<ForgotPasswordResponseEntity>;
}
