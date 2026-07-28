import { ProfilesPermissionsCreateContract } from '../contracts/profiles-permissions-create.contract';
import { ProfilesPermissionsCreateValidateContract } from '../contracts/profiles-permissions-create.validate-contract';
import { validateProfilesPermissionsCreate } from '../validators/profiles-permissions-create.validator';

export function profilesPermissionsCreateVo(
    contract: ProfilesPermissionsCreateContract
): ProfilesPermissionsCreateValidateContract {
    validateProfilesPermissionsCreate(contract);
    return contract;
}
