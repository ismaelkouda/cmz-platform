import { ProfilesPermissionsCreateValidateContract } from '@cmz/settings-security-domain';
import { ProfilesPermissionsCreateApiDto } from '../dtos/profiles-permissions-create-api.dto';

export function profilesPermissionsCreateMapper(
    contract: ProfilesPermissionsCreateValidateContract
): ProfilesPermissionsCreateApiDto {
    const params: ProfilesPermissionsCreateApiDto = {
        name: contract.name,
        description: contract.description,
    };
    if (contract.permissions) {
        params.permissions = contract.permissions;
    }
    return params;
}
