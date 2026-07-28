import { SlideFindOneFilterValidateContract } from '@cmz/content-management-domain';
import { SlideFindOneFilterApiDto } from '../dtos/slide-find-one-filter-api.dto';

export function slideFindOneFilterMapper(
    validContract: SlideFindOneFilterValidateContract
): SlideFindOneFilterApiDto {
    return { id: validContract.uniqId };
}
