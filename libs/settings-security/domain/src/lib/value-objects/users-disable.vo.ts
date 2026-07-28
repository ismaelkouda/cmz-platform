import { UsersDisableContract } from '../contracts/users-disable.contract';
import { UsersDisableValidateContract } from '../contracts/users-disable.validate-contract';
import { validateUsersDisable } from '../validators/users-disable.validator';

export function usersDisableVo(
    contract: UsersDisableContract
): UsersDisableValidateContract {
    validateUsersDisable(contract);
    return contract;
}
