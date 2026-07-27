import { Observable } from 'rxjs';
import { ResetPasswordRequestValidateContract } from '../contracts/reset-password-request.validate-contract';
import { ResetPasswordResponseEntity } from '../entities/reset-password-response.entity';

export abstract class ResetPasswordRepository {
    abstract execute(
        validContract: ResetPasswordRequestValidateContract
    ): Observable<ResetPasswordResponseEntity>;
}
