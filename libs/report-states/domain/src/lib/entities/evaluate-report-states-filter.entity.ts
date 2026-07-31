import { resolveOpenEndedEndDate } from '@cmz/shared-domain';
import { EvaluateReportStatesFilterContract } from '../contracts/evaluate-report-states-filter.contract';

export function evaluateReportStatesFilterEntity(
    contract: EvaluateReportStatesFilterContract
): EvaluateReportStatesFilterContract {
    return {
        ...contract,
        endDate: resolveOpenEndedEndDate(contract.startDate, contract.endDate),
    };
}
