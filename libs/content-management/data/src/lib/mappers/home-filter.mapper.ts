import { HomeFilterContract, HomeStatus } from '@cmz/content-management-domain';
import { HomeFilterApiDto } from '../dtos/home-filter-api.dto';

export function homeFilterMapper(
    validContract: HomeFilterContract
): HomeFilterApiDto {
    const params: HomeFilterApiDto = {};
    if (validContract.search) {
        params.search = validContract.search;
    }
    if (validContract.platforms?.length) {
        params.platforms = validContract.platforms;
    }
    if (validContract.status !== undefined) {
        params.is_active = validContract.status === HomeStatus.ACTIVE;
    }
    if (validContract.startDate) {
        params.start_date = validContract.startDate.toISOString();
    }
    if (validContract.endDate) {
        params.end_date = validContract.endDate.toISOString();
    }
    return params;
}
