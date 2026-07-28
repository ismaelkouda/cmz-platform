import { ProfilesPermissionsDisableValidateContract } from '@cmz/settings-security-domain';
import { ProfilesPermissionsDisableApiDto } from '../dtos/profiles-permissions-disable-api.dto';

export function profilesPermissionsDisableMapper(
    validContract: ProfilesPermissionsDisableValidateContract
): ProfilesPermissionsDisableApiDto {
    return { uniq_id: validContract.uniqId };
}
