import { UsersFindOneFilterContract } from '../contracts/users-find-one-filter.contract';
import { UsersFindOneFilterValidateContract } from '../contracts/users-find-one-filter.validate-contract';
import { validateUsersFindOneFilter } from '../validators/users-find-one-filter.validator';

export function usersFindOneFilterVo(
    contract: UsersFindOneFilterContract
): UsersFindOneFilterValidateContract {
    validateUsersFindOneFilter(contract);
    return contract;
}
