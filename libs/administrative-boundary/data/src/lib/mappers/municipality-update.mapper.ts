import { MunicipalityUpdateValidateContract } from '@cmz/administrative-boundary-domain';
import { MunicipalityUpdateApiDto } from '../dtos/municipality-update-api.dto';

export function municipalityUpdateMapper(
    validContract: MunicipalityUpdateValidateContract
): MunicipalityUpdateApiDto {
    const params = {} as MunicipalityUpdateApiDto;
    params.id = validContract.uniqId;
    params.code = validContract.code;
    params.name = validContract.name;
    params.population_size = validContract.populationSize;
    params.infrastructure_size = validContract.infrastructureCount;
    params.region_id = validContract.regionId;
    params.department_id = validContract.departmentId;
    if (validContract.description) {
        params.description = validContract.description;
    }
    return params;
}
