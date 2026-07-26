import { DepartmentFindOneFilterValidateContract } from '@cmz/administrative-boundary-domain';
import { DepartmentFindOneFilterApiDto } from '../dtos/department-find-one-filter-api.dto';

export function departmentFindOneFilterMapper(
    validContract: DepartmentFindOneFilterValidateContract
): DepartmentFindOneFilterApiDto {
    const params = {} as DepartmentFindOneFilterApiDto;
    params.uniq_id = validContract.uniqId;
    return params;
}
