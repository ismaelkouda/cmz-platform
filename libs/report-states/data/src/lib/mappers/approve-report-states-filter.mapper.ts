import { ApproveReportStatesFilterContract } from '@cmz/report-states-domain';
import { ApproveReportStatesFilterApiDto } from '../dtos/approve-report-states-filter-api.dto';

export function approveReportStatesFilterMapper(
    validContract: ApproveReportStatesFilterContract
): ApproveReportStatesFilterApiDto {
    const params = {} as ApproveReportStatesFilterApiDto;

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
