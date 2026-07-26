import { RegionDeleteValidateContract } from '@cmz/administrative-boundary-domain';
import { RegionDeleteApiDto } from '../dtos/region-delete-api.dto';

export function regionDeleteMapper(
    validContract: RegionDeleteValidateContract
): RegionDeleteApiDto {
    const params = {} as RegionDeleteApiDto;
    params.uniq_id = validContract.uniqId;
    return params;
}
