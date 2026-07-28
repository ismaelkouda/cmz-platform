import { GenericRequiredError } from '@cmz/shared-domain';
import { UsersUpdateContract } from '../contracts/users-update.contract';
import { UsersUpdateValidateContract } from '../contracts/users-update.validate-contract';

export function validateUsersUpdate(
    contract: UsersUpdateContract
): asserts contract is UsersUpdateValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'SETTINGS_SECURITY.USERS.FORM.ERROR.UPDATE.UNIQ_ID_REQUIRE'
        );
    }
    if (!contract.firstName) {
        throw new GenericRequiredError(
            'SETTINGS_SECURITY.USERS.FORM.ERROR.UPDATE.FIRST_NAME_REQUIRE'
        );
    }
    if (!contract.lastName) {
        throw new GenericRequiredError(
            'SETTINGS_SECURITY.USERS.FORM.ERROR.UPDATE.LAST_NAME_REQUIRE'
        );
    }
    if (!contract.email) {
        throw new GenericRequiredError(
            'SETTINGS_SECURITY.USERS.FORM.ERROR.UPDATE.EMAIL_REQUIRE'
        );
    }
    if (!contract.phone) {
        throw new GenericRequiredError(
            'SETTINGS_SECURITY.USERS.FORM.ERROR.UPDATE.PHONE_REQUIRE'
        );
    }
    if (!contract.profileId) {
        throw new GenericRequiredError(
            'SETTINGS_SECURITY.USERS.FORM.ERROR.UPDATE.PROFILE_REQUIRE'
        );
    }
}
