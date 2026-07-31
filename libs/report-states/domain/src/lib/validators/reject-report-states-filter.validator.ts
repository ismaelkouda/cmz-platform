import { assertValidDateRange } from '@cmz/shared-domain';
import { RejectReportStatesFilterContract } from '../contracts/reject-report-states-filter.contract';

export function validateRejectReportStatesFilter(
    contract: RejectReportStatesFilterContract
): void {
    assertValidDateRange(contract.startDate, contract.endDate);
}
