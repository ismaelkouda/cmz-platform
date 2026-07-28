import { UsersEnableContract } from '../contracts/users-enable.contract';
import { UsersEnableValidateContract } from '../contracts/users-enable.validate-contract';
import { validateUsersEnable } from '../validators/users-enable.validator';

export function usersEnableVo(
    contract: UsersEnableContract
): UsersEnableValidateContract {
    validateUsersEnable(contract);
    return contract;
}
