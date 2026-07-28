import { UsersFilterContract } from '../contracts/users-filter.contract';
import { validateUsersFilter } from '../validators/users-filter.validator';

export function usersFilterVo(
    contract: UsersFilterContract
): UsersFilterContract {
    validateUsersFilter(contract);
    return contract;
}
