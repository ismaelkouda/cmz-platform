import { GenericRequiredError } from '@cmz/shared-domain';
import { UsersDisableContract } from '../contracts/users-disable.contract';
import { UsersDisableValidateContract } from '../contracts/users-disable.validate-contract';

export function validateUsersDisable(
    contract: UsersDisableContract
): asserts contract is UsersDisableValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'SETTINGS_SECURITY.USERS.ERROR.DISABLE.UNIQ_ID_REQUIRE'
        );
    }
}
