import { ProfilesPermissionsFindOneFilterValidateContract } from '@cmz/settings-security-domain';
import { ProfilesPermissionsFindOneFilterApiDto } from '../dtos/profiles-permissions-find-one-filter-api.dto';

export function profilesPermissionsFindOneFilterMapper(
    validContract: ProfilesPermissionsFindOneFilterValidateContract
): ProfilesPermissionsFindOneFilterApiDto {
    return { id: validContract.uniqId };
}
