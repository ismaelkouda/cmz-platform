import { GenericRequiredError } from '@cmz/shared-domain';
import { ProfilesPermissionsFindOneFilterContract } from '../contracts/profiles-permissions-find-one-filter.contract';
import { ProfilesPermissionsFindOneFilterValidateContract } from '../contracts/profiles-permissions-find-one-filter.validate-contract';

export function validateProfilesPermissionsFindOneFilter(
    contract: ProfilesPermissionsFindOneFilterContract
): asserts contract is ProfilesPermissionsFindOneFilterValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'SETTINGS_SECURITY.PROFILES_PERMISSIONS.ERROR.FIND_ONE.UNIQ_ID_REQUIRE'
        );
    }
}
