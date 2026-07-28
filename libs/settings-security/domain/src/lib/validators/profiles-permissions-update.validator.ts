import { GenericRequiredError } from '@cmz/shared-domain';
import { ProfilesPermissionsUpdateContract } from '../contracts/profiles-permissions-update.contract';
import { ProfilesPermissionsUpdateValidateContract } from '../contracts/profiles-permissions-update.validate-contract';

export function validateProfilesPermissionsUpdate(
    contract: ProfilesPermissionsUpdateContract
): asserts contract is ProfilesPermissionsUpdateValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'SETTINGS_SECURITY.PROFILES_PERMISSIONS.FORM.ERROR.UPDATE.UNIQ_ID_REQUIRE'
        );
    }
    if (!contract.name) {
        throw new GenericRequiredError(
            'SETTINGS_SECURITY.PROFILES_PERMISSIONS.FORM.ERROR.UPDATE.NAME_REQUIRE'
        );
    }
    if (!contract.description) {
        throw new GenericRequiredError(
            'SETTINGS_SECURITY.PROFILES_PERMISSIONS.FORM.ERROR.UPDATE.DESCRIPTION_REQUIRE'
        );
    }
}
