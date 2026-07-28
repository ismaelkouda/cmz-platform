import { GenericRequiredError } from '@cmz/shared-domain';
import { UsersFindOneFilterContract } from '../contracts/users-find-one-filter.contract';
import { UsersFindOneFilterValidateContract } from '../contracts/users-find-one-filter.validate-contract';

export function validateUsersFindOneFilter(
    contract: UsersFindOneFilterContract
): asserts contract is UsersFindOneFilterValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'SETTINGS_SECURITY.USERS.ERROR.FIND_ONE.UNIQ_ID_REQUIRE'
        );
    }
}
