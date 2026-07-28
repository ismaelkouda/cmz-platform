import { UsersCreateValidateContract } from '@cmz/settings-security-domain';
import { UsersCreateApiDto } from '../dtos/users-create-api.dto';

/**
 * Pas de `role` : champ mort en écriture côté source (cf. dto).
 */
export function usersCreateMapper(
    contract: UsersCreateValidateContract
): UsersCreateApiDto {
    return {
        first_name: contract.firstName,
        last_name: contract.lastName,
        email: contract.email,
        phone: contract.phone,
        profile_id: contract.profileId,
    };
}
