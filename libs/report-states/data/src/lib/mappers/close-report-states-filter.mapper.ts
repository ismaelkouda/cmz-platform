import { CloseReportStatesFilterContract } from '@cmz/report-states-domain';
import { CloseReportStatesFilterApiDto } from '../dtos/close-report-states-filter-api.dto';

export function closeReportStatesFilterMapper(
    validContract: CloseReportStatesFilterContract
): CloseReportStatesFilterApiDto {
    const params = {} as CloseReportStatesFilterApiDto;

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
