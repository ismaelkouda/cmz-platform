import { UsersCreateContract } from '../contracts/users-create.contract';
import { UsersCreateValidateContract } from '../contracts/users-create.validate-contract';
import { validateUsersCreate } from '../validators/users-create.validator';

export function usersCreateVo(
    contract: UsersCreateContract
): UsersCreateValidateContract {
    validateUsersCreate(contract);
    return contract;
}
