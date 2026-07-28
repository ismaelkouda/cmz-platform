import { ProfilesPermissionsUpdateValidateContract } from '@cmz/settings-security-domain';
import { ProfilesPermissionsUpdateApiDto } from '../dtos/profiles-permissions-update-api.dto';

export function profilesPermissionsUpdateMapper(
    contract: ProfilesPermissionsUpdateValidateContract
): ProfilesPermissionsUpdateApiDto {
    const params: ProfilesPermissionsUpdateApiDto = {
        id: contract.uniqId,
        name: contract.name,
        description: contract.description,
    };
    if (contract.permissions) {
        params.permissions = contract.permissions;
    }
    return params;
}
