import { RegionUpdateValidateContract } from '@cmz/administrative-boundary-domain';
import { RegionUpdateApiDto } from '../dtos/region-update-api.dto';

export function regionUpdateMapper(
    validContract: RegionUpdateValidateContract
): RegionUpdateApiDto {
    const params = {} as RegionUpdateApiDto;
    params.id = validContract.uniqId;
    params.code = validContract.code;
    params.name = validContract.name;
    params.population_size = validContract.populationSize;
    params.infrastructure_size = validContract.infrastructureCount;
    if (validContract.description) {
        params.description = validContract.description;
    }
    return params;
}
