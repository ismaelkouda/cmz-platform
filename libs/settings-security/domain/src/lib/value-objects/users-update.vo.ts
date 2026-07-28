import { UsersUpdateContract } from '../contracts/users-update.contract';
import { UsersUpdateValidateContract } from '../contracts/users-update.validate-contract';
import { validateUsersUpdate } from '../validators/users-update.validator';

export function usersUpdateVo(
    contract: UsersUpdateContract
): UsersUpdateValidateContract {
    validateUsersUpdate(contract);
    return contract;
}
