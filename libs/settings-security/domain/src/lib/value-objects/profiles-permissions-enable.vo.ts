import { ProfilesPermissionsEnableContract } from '../contracts/profiles-permissions-enable.contract';
import { ProfilesPermissionsEnableValidateContract } from '../contracts/profiles-permissions-enable.validate-contract';
import { validateProfilesPermissionsEnable } from '../validators/profiles-permissions-enable.validator';

export function profilesPermissionsEnableVo(
    contract: ProfilesPermissionsEnableContract
): ProfilesPermissionsEnableValidateContract {
    validateProfilesPermissionsEnable(contract);
    return contract;
}
