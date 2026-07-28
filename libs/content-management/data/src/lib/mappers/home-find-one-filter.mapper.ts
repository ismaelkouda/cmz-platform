import { HomeFindOneFilterValidateContract } from '@cmz/content-management-domain';
import { HomeFindOneFilterApiDto } from '../dtos/home-find-one-filter-api.dto';

export function homeFindOneFilterMapper(
    validContract: HomeFindOneFilterValidateContract
): HomeFindOneFilterApiDto {
    return { id: validContract.uniqId };
}
