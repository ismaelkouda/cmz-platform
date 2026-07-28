import {
    SlideFilterContract,
    SlideStatus,
} from '@cmz/content-management-domain';
import { SlideFilterApiDto } from '../dtos/slide-filter-api.dto';

export function slideFilterMapper(
    validContract: SlideFilterContract
): SlideFilterApiDto {
    const params: SlideFilterApiDto = {};
    if (validContract.search) {
        params.search = validContract.search;
    }
    if (validContract.platforms?.length) {
        params.platforms = validContract.platforms;
    }
    if (validContract.status !== undefined) {
        params.is_active = validContract.status === SlideStatus.ACTIVE;
    }
    if (validContract.startDate) {
        params.start_date = validContract.startDate.toISOString();
    }
    if (validContract.endDate) {
        params.end_date = validContract.endDate.toISOString();
    }
    return params;
}
