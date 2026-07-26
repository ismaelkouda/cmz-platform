import { DepartmentFilterContract } from '@cmz/administrative-boundary-domain';
import { DepartmentFilterApiDto } from '../dtos/department-filter-api.dto';

export function departmentFilterMapper(
    validContract: DepartmentFilterContract
): DepartmentFilterApiDto {
    const params = {} as DepartmentFilterApiDto;
    if (validContract.search) {
        params.search = validContract.search;
    }
    if (validContract.regionId) {
        params.region_id = validContract.regionId;
    }
    if (validContract.startDate) {
        params.start_date = validContract.startDate;
    }
    if (validContract.endDate) {
        params.end_date = validContract.endDate;
    }
    return params;
}
