import { normalizePhoneNumber } from '@cmz/shared-domain';
import { RejectReportStatesFilterContract } from '../contracts/reject-report-states-filter.contract';
import { validateRejectReportStatesFilter } from '../validators/reject-report-states-filter.validator';

export function rejectReportStatesFilterVo(
    contract: RejectReportStatesFilterContract
): RejectReportStatesFilterContract {
    const resolved: RejectReportStatesFilterContract = {
        ...contract,
        initiatorPhoneNumber: normalizePhoneNumber(
            contract.initiatorPhoneNumber?.trim()
        ),
        uniqId: contract.uniqId?.trim() || undefined,
        source: contract.source?.trim() || undefined,
    };
    validateRejectReportStatesFilter(resolved);
    return resolved;
}
