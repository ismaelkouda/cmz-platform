import { assertValidDateRange } from '@cmz/shared-domain';
import { EvaluateReportStatesFilterContract } from '../contracts/evaluate-report-states-filter.contract';

export function validateEvaluateReportStatesFilter(
    contract: EvaluateReportStatesFilterContract
): void {
    assertValidDateRange(contract.startDate, contract.endDate);
}
