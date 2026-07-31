import { resolveOpenEndedEndDate } from '@cmz/shared-domain';
import { RejectReportStatesFilterContract } from '../contracts/reject-report-states-filter.contract';

export function rejectReportStatesFilterEntity(
    contract: RejectReportStatesFilterContract
): RejectReportStatesFilterContract {
    return {
        ...contract,
        endDate: resolveOpenEndedEndDate(contract.startDate, contract.endDate),
    };
}
