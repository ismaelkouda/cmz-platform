import { UsersEnableValidateContract } from '@cmz/settings-security-domain';
import { UsersEnableApiDto } from '../dtos/users-enable-api.dto';

export function usersEnableMapper(
    validContract: UsersEnableValidateContract
): UsersEnableApiDto {
    return { uniq_id: validContract.uniqId };
}
