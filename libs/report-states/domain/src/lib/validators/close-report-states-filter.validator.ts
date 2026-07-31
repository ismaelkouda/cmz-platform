import { assertValidDateRange } from '@cmz/shared-domain';
import { CloseReportStatesFilterContract } from '../contracts/close-report-states-filter.contract';

export function validateCloseReportStatesFilter(
    contract: CloseReportStatesFilterContract
): void {
    assertValidDateRange(contract.startDate, contract.endDate);
}
