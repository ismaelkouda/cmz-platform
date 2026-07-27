import { LoginRequestContract } from '../contracts/login-request.contract';
import { LoginRequestValidateContract } from '../contracts/login-request.validate-contract';
import { validateLoginRequest } from '../validators/login-request.validator';

export function loginRequestVo(
    contract: LoginRequestContract
): LoginRequestValidateContract {
    validateLoginRequest(contract);
    return {
        email: contract.email.trim(),
        password: contract.password,
    };
}
