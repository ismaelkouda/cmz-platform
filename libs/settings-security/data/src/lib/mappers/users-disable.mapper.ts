import { UsersDisableValidateContract } from '@cmz/settings-security-domain';
import { UsersDisableApiDto } from '../dtos/users-disable-api.dto';

export function usersDisableMapper(
    validContract: UsersDisableValidateContract
): UsersDisableApiDto {
    return { uniq_id: validContract.uniqId };
}
