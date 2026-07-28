import { GenericRequiredError } from '@cmz/shared-domain';
import { UsersDeleteContract } from '../contracts/users-delete.contract';
import { UsersDeleteValidateContract } from '../contracts/users-delete.validate-contract';

export function validateUsersDelete(
    contract: UsersDeleteContract
): asserts contract is UsersDeleteValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'SETTINGS_SECURITY.USERS.ERROR.DELETE.UNIQ_ID_REQUIRE'
        );
    }
}
