import { MunicipalityCreateValidateContract } from '@cmz/administrative-boundary-domain';
import { MunicipalityCreateApiDto } from '../dtos/municipality-create-api.dto';

export function municipalityCreateMapper(
    validContract: MunicipalityCreateValidateContract
): MunicipalityCreateApiDto {
    const params = {} as MunicipalityCreateApiDto;
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
