import { normalizePhoneNumber } from '@cmz/shared-domain';
import { CloseReportStatesFilterContract } from '../contracts/close-report-states-filter.contract';
import { validateCloseReportStatesFilter } from '../validators/close-report-states-filter.validator';

export function closeReportStatesFilterVo(
    contract: CloseReportStatesFilterContract
): CloseReportStatesFilterContract {
    const resolved: CloseReportStatesFilterContract = {
        ...contract,
        initiatorPhoneNumber: normalizePhoneNumber(
            contract.initiatorPhoneNumber?.trim()
        ),
        uniqId: contract.uniqId?.trim() || undefined,
        source: contract.source?.trim() || undefined,
    };
    validateCloseReportStatesFilter(resolved);
    return resolved;
}
