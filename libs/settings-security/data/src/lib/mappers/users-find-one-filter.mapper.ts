import { UsersFindOneFilterValidateContract } from '@cmz/settings-security-domain';
import { UsersFindOneFilterApiDto } from '../dtos/users-find-one-filter-api.dto';

export function usersFindOneFilterMapper(
    validContract: UsersFindOneFilterValidateContract
): UsersFindOneFilterApiDto {
    return { id: validContract.uniqId };
}
