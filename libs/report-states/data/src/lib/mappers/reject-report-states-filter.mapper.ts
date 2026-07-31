import { RejectReportStatesFilterContract } from '@cmz/report-states-domain';
import { RejectReportStatesFilterApiDto } from '../dtos/reject-report-states-filter-api.dto';

export function rejectReportStatesFilterMapper(
    validContract: RejectReportStatesFilterContract
): RejectReportStatesFilterApiDto {
    const params = {} as RejectReportStatesFilterApiDto;

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
