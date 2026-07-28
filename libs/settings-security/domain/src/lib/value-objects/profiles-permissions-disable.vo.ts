import { ProfilesPermissionsDisableContract } from '../contracts/profiles-permissions-disable.contract';
import { ProfilesPermissionsDisableValidateContract } from '../contracts/profiles-permissions-disable.validate-contract';
import { validateProfilesPermissionsDisable } from '../validators/profiles-permissions-disable.validator';

export function profilesPermissionsDisableVo(
    contract: ProfilesPermissionsDisableContract
): ProfilesPermissionsDisableValidateContract {
    validateProfilesPermissionsDisable(contract);
    return contract;
}
