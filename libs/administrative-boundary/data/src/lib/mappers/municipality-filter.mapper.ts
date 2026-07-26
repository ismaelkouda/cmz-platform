import { MunicipalityFilterContract } from '@cmz/administrative-boundary-domain';
import { MunicipalityFilterApiDto } from '../dtos/municipality-filter-api.dto';

export function municipalityFilterMapper(
    validContract: MunicipalityFilterContract
): MunicipalityFilterApiDto {
    const params = {} as MunicipalityFilterApiDto;
    if (validContract.search) {
        params.search = validContract.search;
    }
    if (validContract.regionId) {
        params.region_id = validContract.regionId;
    }
    if (validContract.departmentId) {
        params.department_id = validContract.departmentId;
    }
    if (validContract.startDate) {
        params.start_date = validContract.startDate;
    }
    if (validContract.endDate) {
        params.end_date = validContract.endDate;
    }
    return params;
}
