import { ProfilesPermissionsFilterContract } from '../contracts/profiles-permissions-filter.contract';
import { validateProfilesPermissionsFilter } from '../validators/profiles-permissions-filter.validator';

export function profilesPermissionsFilterVo(
    contract: ProfilesPermissionsFilterContract
): ProfilesPermissionsFilterContract {
    validateProfilesPermissionsFilter(contract);
    return contract;
}
