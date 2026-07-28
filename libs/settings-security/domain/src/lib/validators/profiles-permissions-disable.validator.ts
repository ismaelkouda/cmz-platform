import { GenericRequiredError } from '@cmz/shared-domain';
import { ProfilesPermissionsDisableContract } from '../contracts/profiles-permissions-disable.contract';
import { ProfilesPermissionsDisableValidateContract } from '../contracts/profiles-permissions-disable.validate-contract';

export function validateProfilesPermissionsDisable(
    contract: ProfilesPermissionsDisableContract
): asserts contract is ProfilesPermissionsDisableValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'SETTINGS_SECURITY.PROFILES_PERMISSIONS.ERROR.DISABLE.UNIQ_ID_REQUIRE'
        );
    }
}
