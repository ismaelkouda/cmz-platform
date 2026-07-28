import { UsersUpdateValidateContract } from '@cmz/settings-security-domain';
import { UsersUpdateApiDto } from '../dtos/users-update-api.dto';

export function usersUpdateMapper(
    contract: UsersUpdateValidateContract
): UsersUpdateApiDto {
    return {
        id: contract.uniqId,
        first_name: contract.firstName,
        last_name: contract.lastName,
        email: contract.email,
        phone: contract.phone,
        profile_id: contract.profileId,
    };
}
