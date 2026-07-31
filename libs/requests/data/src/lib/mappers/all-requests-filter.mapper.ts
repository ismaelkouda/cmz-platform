import { AllRequestsFilterContract } from '@cmz/requests-domain';
import { AllRequestsFilterApiDto } from '../dtos/all-requests-filter-api.dto';

export function allRequestsFilterMapper(
    validContract: AllRequestsFilterContract
): AllRequestsFilterApiDto {
    const params = {} as AllRequestsFilterApiDto;

    if (validContract.initiatorPhoneNumber) {
        params.initiator_phone_number = validContract.initiatorPhoneNumber;
    }
    if (validContract.uniqId) {
        params.uniq_id = validContract.uniqId;
    }
    if (validContract.reportType) {
        params.report_type = validContract.reportType;
    }
    if (validContract.operators?.length) {
        params.operators = validContract.operators;
    }
    if (validContract.source) {
        params.source = validContract.source;
    }
    if (validContract.startDate) {
        params.start_date = validContract.startDate;
    }
    if (validContract.endDate) {
        params.end_date = validContract.endDate;
    }
    if (validContract.status) {
        params.status = validContract.status;
    }

    return params;
}
