import { DepartmentsByRegionIdFilterValidateContract } from '@cmz/administrative-boundary-domain';
import { DepartmentsByRegionIdFilterApiDto } from '../dtos/departments-by-region-id-filter-api.dto';

export function departmentsByRegionIdFilterMapper(
    validContract: DepartmentsByRegionIdFilterValidateContract
): DepartmentsByRegionIdFilterApiDto {
    const params = {} as DepartmentsByRegionIdFilterApiDto;
    params.region_id = validContract.regionId;
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
