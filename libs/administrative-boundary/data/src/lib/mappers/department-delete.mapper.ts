import { DepartmentDeleteValidateContract } from '@cmz/administrative-boundary-domain';
import { DepartmentDeleteApiDto } from '../dtos/department-delete-api.dto';

export function departmentDeleteMapper(
    validContract: DepartmentDeleteValidateContract
): DepartmentDeleteApiDto {
    const params = {} as DepartmentDeleteApiDto;
    params.uniq_id = validContract.uniqId;
    return params;
}
