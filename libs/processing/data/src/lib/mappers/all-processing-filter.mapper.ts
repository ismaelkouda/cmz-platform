import { AllProcessingFilterContract } from '@cmz/processing-domain';
import { AllProcessingFilterApiDto } from '../dtos/all-processing-filter-api.dto';

export function allProcessingFilterMapper(
    validContract: AllProcessingFilterContract
): AllProcessingFilterApiDto {
    const params = {} as AllProcessingFilterApiDto;

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
    if (validContract.state) {
        params.state = validContract.state;
    }

    return params;
}
