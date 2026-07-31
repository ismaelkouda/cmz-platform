import { normalizePhoneNumber } from '@cmz/shared-domain';
import { ApproveReportStatesFilterContract } from '../contracts/approve-report-states-filter.contract';
import { validateApproveReportStatesFilter } from '../validators/approve-report-states-filter.validator';

export function approveReportStatesFilterVo(
    contract: ApproveReportStatesFilterContract
): ApproveReportStatesFilterContract {
    const resolved: ApproveReportStatesFilterContract = {
        ...contract,
        initiatorPhoneNumber: normalizePhoneNumber(
            contract.initiatorPhoneNumber?.trim()
        ),
        uniqId: contract.uniqId?.trim() || undefined,
        source: contract.source?.trim() || undefined,
    };
    validateApproveReportStatesFilter(resolved);
    return resolved;
}
