import { NewsFilterContract, NewsStatus } from '@cmz/content-management-domain';
import { NewsFilterApiDto } from '../dtos/news-filter-api.dto';

export function newsFilterMapper(
    validContract: NewsFilterContract
): NewsFilterApiDto {
    const params: NewsFilterApiDto = {};
    if (validContract.search) {
        params.search = validContract.search;
    }
    if (validContract.status !== undefined) {
        params.is_published = validContract.status === NewsStatus.PUBLISH;
    }
    if (validContract.startDate) {
        params.start_date = validContract.startDate.toISOString();
    }
    if (validContract.endDate) {
        params.end_date = validContract.endDate.toISOString();
    }
    return params;
}
