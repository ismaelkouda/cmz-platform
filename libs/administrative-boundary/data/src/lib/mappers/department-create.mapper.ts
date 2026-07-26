import { DepartmentCreateValidateContract } from '@cmz/administrative-boundary-domain';
import { DepartmentCreateApiDto } from '../dtos/department-create-api.dto';

export function departmentCreateMapper(
    validContract: DepartmentCreateValidateContract
): DepartmentCreateApiDto {
    const params = {} as DepartmentCreateApiDto;
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
