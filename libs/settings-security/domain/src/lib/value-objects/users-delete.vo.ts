import { UsersDeleteContract } from '../contracts/users-delete.contract';
import { UsersDeleteValidateContract } from '../contracts/users-delete.validate-contract';
import { validateUsersDelete } from '../validators/users-delete.validator';

export function usersDeleteVo(
    contract: UsersDeleteContract
): UsersDeleteValidateContract {
    validateUsersDelete(contract);
    return contract;
}
