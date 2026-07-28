import { GenericRequiredError } from '@cmz/shared-domain';
import { ProfilesPermissionsEnableContract } from '../contracts/profiles-permissions-enable.contract';
import { ProfilesPermissionsEnableValidateContract } from '../contracts/profiles-permissions-enable.validate-contract';

export function validateProfilesPermissionsEnable(
    contract: ProfilesPermissionsEnableContract
): asserts contract is ProfilesPermissionsEnableValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'SETTINGS_SECURITY.PROFILES_PERMISSIONS.ERROR.ENABLE.UNIQ_ID_REQUIRE'
        );
    }
}
