import { ProfilesPermissionsUpdateContract } from '../contracts/profiles-permissions-update.contract';
import { ProfilesPermissionsUpdateValidateContract } from '../contracts/profiles-permissions-update.validate-contract';
import { validateProfilesPermissionsUpdate } from '../validators/profiles-permissions-update.validator';

export function profilesPermissionsUpdateVo(
    contract: ProfilesPermissionsUpdateContract
): ProfilesPermissionsUpdateValidateContract {
    validateProfilesPermissionsUpdate(contract);
    return contract;
}
