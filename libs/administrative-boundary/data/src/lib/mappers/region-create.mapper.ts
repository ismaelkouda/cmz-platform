import { RegionCreateValidateContract } from '@cmz/administrative-boundary-domain';
import { RegionCreateApiDto } from '../dtos/region-create-api.dto';

export function regionCreateMapper(
    validContract: RegionCreateValidateContract
): RegionCreateApiDto {
    const params = {} as RegionCreateApiDto;
    params.code = validContract.code;
    params.name = validContract.name;
    params.population_size = validContract.populationSize;
    params.infrastructure_size = validContract.infrastructureCount;
    if (validContract.description) {
        params.description = validContract.description;
    }
    return params;
}
