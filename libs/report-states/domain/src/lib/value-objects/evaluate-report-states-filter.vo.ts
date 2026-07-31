import { normalizePhoneNumber } from '@cmz/shared-domain';
import { EvaluateReportStatesFilterContract } from '../contracts/evaluate-report-states-filter.contract';
import { validateEvaluateReportStatesFilter } from '../validators/evaluate-report-states-filter.validator';

export function evaluateReportStatesFilterVo(
    contract: EvaluateReportStatesFilterContract
): EvaluateReportStatesFilterContract {
    const resolved: EvaluateReportStatesFilterContract = {
        ...contract,
        initiatorPhoneNumber: normalizePhoneNumber(
            contract.initiatorPhoneNumber?.trim()
        ),
        uniqId: contract.uniqId?.trim() || undefined,
        source: contract.source?.trim() || undefined,
    };
    validateEvaluateReportStatesFilter(resolved);
    return resolved;
}
