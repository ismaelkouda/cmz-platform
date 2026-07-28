import { ProfilesPermissionsDeleteContract } from '../contracts/profiles-permissions-delete.contract';
import { ProfilesPermissionsDeleteValidateContract } from '../contracts/profiles-permissions-delete.validate-contract';
import { validateProfilesPermissionsDelete } from '../validators/profiles-permissions-delete.validator';

export function profilesPermissionsDeleteVo(
    contract: ProfilesPermissionsDeleteContract
): ProfilesPermissionsDeleteValidateContract {
    validateProfilesPermissionsDelete(contract);
    return contract;
}
