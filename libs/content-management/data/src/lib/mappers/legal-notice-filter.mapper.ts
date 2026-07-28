import {
    LegalNoticeFilterContract,
    LegalNoticeStatus,
} from '@cmz/content-management-domain';
import { LegalNoticeFilterApiDto } from '../dtos/legal-notice-filter-api.dto';

export function legalNoticeFilterMapper(
    validContract: LegalNoticeFilterContract
): LegalNoticeFilterApiDto {
    const params: LegalNoticeFilterApiDto = {};
    if (validContract.search) {
        params.search = validContract.search;
    }
    if (validContract.version) {
        params.version = validContract.version;
    }
    if (validContract.status !== undefined) {
        params.is_published =
            validContract.status === LegalNoticeStatus.PUBLISH;
    }
    if (validContract.startDate) {
        params.start_date = validContract.startDate.toISOString();
    }
    if (validContract.endDate) {
        params.end_date = validContract.endDate.toISOString();
    }
    return params;
}
