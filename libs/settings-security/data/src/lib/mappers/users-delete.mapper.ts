import { UsersDeleteValidateContract } from '@cmz/settings-security-domain';
import { UsersDeleteApiDto } from '../dtos/users-delete-api.dto';

export function usersDeleteMapper(
    validContract: UsersDeleteValidateContract
): UsersDeleteApiDto {
    return { uniq_id: validContract.uniqId };
}
