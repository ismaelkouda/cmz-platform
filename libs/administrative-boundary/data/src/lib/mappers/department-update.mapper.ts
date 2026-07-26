import { DepartmentUpdateValidateContract } from '@cmz/administrative-boundary-domain';
import { DepartmentUpdateApiDto } from '../dtos/department-update-api.dto';

export function departmentUpdateMapper(
    validContract: DepartmentUpdateValidateContract
): DepartmentUpdateApiDto {
    const params = {} as DepartmentUpdateApiDto;
    params.id = validContract.uniqId;
    params.code = validContract.code;
    params.name = validContract.name;
    params.population_size = validContract.populationSize;
    params.infrastructure_size = validContract.infrastructureCount;
    params.region_id = validContract.regionId;
    if (validContract.description) {
        params.description = validContract.description;
    }
    return params;
}
