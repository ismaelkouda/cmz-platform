import { GenericRequiredError } from '@cmz/shared-domain';
import { ProfilesPermissionsDeleteContract } from '../contracts/profiles-permissions-delete.contract';
import { ProfilesPermissionsDeleteValidateContract } from '../contracts/profiles-permissions-delete.validate-contract';

export function validateProfilesPermissionsDelete(
    contract: ProfilesPermissionsDeleteContract
): asserts contract is ProfilesPermissionsDeleteValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'SETTINGS_SECURITY.PROFILES_PERMISSIONS.ERROR.DELETE.UNIQ_ID_REQUIRE'
        );
    }
}
