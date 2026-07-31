import { resolveOpenEndedEndDate } from '@cmz/shared-domain';
import { ApproveReportStatesFilterContract } from '../contracts/approve-report-states-filter.contract';

export function approveReportStatesFilterEntity(
    contract: ApproveReportStatesFilterContract
): ApproveReportStatesFilterContract {
    return {
        ...contract,
        endDate: resolveOpenEndedEndDate(contract.startDate, contract.endDate),
    };
}
