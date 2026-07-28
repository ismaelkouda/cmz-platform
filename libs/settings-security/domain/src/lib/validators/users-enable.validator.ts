import { GenericRequiredError } from '@cmz/shared-domain';
import { UsersEnableContract } from '../contracts/users-enable.contract';
import { UsersEnableValidateContract } from '../contracts/users-enable.validate-contract';

export function validateUsersEnable(
    contract: UsersEnableContract
): asserts contract is UsersEnableValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'SETTINGS_SECURITY.USERS.ERROR.ENABLE.UNIQ_ID_REQUIRE'
        );
    }
}
