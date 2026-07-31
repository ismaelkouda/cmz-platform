import { assertValidDateRange } from '@cmz/shared-domain';
import { ApproveReportStatesFilterContract } from '../contracts/approve-report-states-filter.contract';

export function validateApproveReportStatesFilter(
    contract: ApproveReportStatesFilterContract
): void {
    assertValidDateRange(contract.startDate, contract.endDate);
}
