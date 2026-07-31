import { QueuesRequestsFilterContract } from '@cmz/requests-domain';
import { QueuesRequestsFilterApiDto } from '../dtos/queues-requests-filter-api.dto';

export function queuesRequestsFilterMapper(
    validContract: QueuesRequestsFilterContract
): QueuesRequestsFilterApiDto {
    const params = {} as QueuesRequestsFilterApiDto;

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

    return params;
}
