import { RegionFilterContract } from '@cmz/administrative-boundary-domain';
import { RegionFilterApiDto } from '../dtos/region-filter-api.dto';

export function regionFilterMapper(
    validContract: RegionFilterContract
): RegionFilterApiDto {
    const params = {} as RegionFilterApiDto;
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
