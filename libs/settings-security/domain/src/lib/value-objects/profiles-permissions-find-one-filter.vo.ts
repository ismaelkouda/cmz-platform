import { ProfilesPermissionsFindOneFilterContract } from '../contracts/profiles-permissions-find-one-filter.contract';
import { ProfilesPermissionsFindOneFilterValidateContract } from '../contracts/profiles-permissions-find-one-filter.validate-contract';
import { validateProfilesPermissionsFindOneFilter } from '../validators/profiles-permissions-find-one-filter.validator';

export function profilesPermissionsFindOneFilterVo(
    contract: ProfilesPermissionsFindOneFilterContract
): ProfilesPermissionsFindOneFilterValidateContract {
    validateProfilesPermissionsFindOneFilter(contract);
    return contract;
}
