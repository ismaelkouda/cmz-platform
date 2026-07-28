import { ProfilesPermissionsDeleteValidateContract } from '@cmz/settings-security-domain';
import { ProfilesPermissionsDeleteApiDto } from '../dtos/profiles-permissions-delete-api.dto';

export function profilesPermissionsDeleteMapper(
    validContract: ProfilesPermissionsDeleteValidateContract
): ProfilesPermissionsDeleteApiDto {
    return { uniq_id: validContract.uniqId };
}
