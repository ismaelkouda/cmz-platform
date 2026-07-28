import {
    PrivacyPolicyFilterContract,
    PrivacyPolicyStatus,
} from '@cmz/content-management-domain';
import { PrivacyPolicyFilterApiDto } from '../dtos/privacy-policy-filter-api.dto';

export function privacyPolicyFilterMapper(
    validContract: PrivacyPolicyFilterContract
): PrivacyPolicyFilterApiDto {
    const params: PrivacyPolicyFilterApiDto = {};
    if (validContract.search) {
        params.search = validContract.search;
    }
    if (validContract.version) {
        params.version = validContract.version;
    }
    if (validContract.status !== undefined) {
        params.is_published =
            validContract.status === PrivacyPolicyStatus.PUBLISH;
    }
    if (validContract.startDate) {
        params.start_date = validContract.startDate.toISOString();
    }
    if (validContract.endDate) {
        params.end_date = validContract.endDate.toISOString();
    }
    return params;
}
