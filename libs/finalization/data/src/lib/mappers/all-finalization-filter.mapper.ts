import { AllFinalizationFilterContract } from '@cmz/finalization-domain';
import { AllFinalizationFilterApiDto } from '../dtos/all-finalization-filter-api.dto';

export function allFinalizationFilterMapper(
    validContract: AllFinalizationFilterContract
): AllFinalizationFilterApiDto {
    const params = {} as AllFinalizationFilterApiDto;

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
