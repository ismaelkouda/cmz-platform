import {
    TermsUseFilterContract,
    TermsUseStatus,
} from '@cmz/content-management-domain';
import { TermsUseFilterApiDto } from '../dtos/terms-use-filter-api.dto';

export function termsUseFilterMapper(
    validContract: TermsUseFilterContract
): TermsUseFilterApiDto {
    const params: TermsUseFilterApiDto = {};
    if (validContract.search) {
        params.search = validContract.search;
    }
    if (validContract.version) {
        params.version = validContract.version;
    }
    if (validContract.status !== undefined) {
        params.is_published = validContract.status === TermsUseStatus.PUBLISH;
    }
    if (validContract.startDate) {
        params.start_date = validContract.startDate.toISOString();
    }
    if (validContract.endDate) {
        params.end_date = validContract.endDate.toISOString();
    }
    return params;
}
