import { MunicipalitiesByDepartmentIdFilterValidateContract } from '@cmz/administrative-boundary-domain';
import { MunicipalitiesByDepartmentIdFilterApiDto } from '../dtos/municipalities-by-department-id-filter-api.dto';

export function municipalitiesByDepartmentIdFilterMapper(
    validContract: MunicipalitiesByDepartmentIdFilterValidateContract
): MunicipalitiesByDepartmentIdFilterApiDto {
    const params = {} as MunicipalitiesByDepartmentIdFilterApiDto;
    params.department_id = validContract.departmentId;
    if (validContract.search) {
        params.search = validContract.search;
    }
    if (validContract.startDate) {
        params.start_date = validContract.startDate;
    }
    if (validContract.endDate) {
        params.end_date = validContract.endDate;
    }
    return params;
}
