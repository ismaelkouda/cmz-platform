import { RegionFindOneFilterValidateContract } from '@cmz/administrative-boundary-domain';
import { RegionFindOneFilterApiDto } from '../dtos/region-find-one-filter-api.dto';

export function regionFindOneFilterMapper(
    validContract: RegionFindOneFilterValidateContract
): RegionFindOneFilterApiDto {
    const params = {} as RegionFindOneFilterApiDto;
    params.uniq_id = validContract.uniqId;
    return params;
}
