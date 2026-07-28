import { ProfilesPermissionsEnableValidateContract } from '@cmz/settings-security-domain';
import { ProfilesPermissionsEnableApiDto } from '../dtos/profiles-permissions-enable-api.dto';

export function profilesPermissionsEnableMapper(
    validContract: ProfilesPermissionsEnableValidateContract
): ProfilesPermissionsEnableApiDto {
    return { uniq_id: validContract.uniqId };
}
