import { normalizePhoneNumber } from '@cmz/shared-domain';
import { AllRequestsFilterContract } from '../contracts/all-requests-filter.contract';
import { validateAllRequestsFilter } from '../validators/all-requests-filter.validator';

export function allRequestsFilterVo(
    contract: AllRequestsFilterContract
): AllRequestsFilterContract {
    const resolved: AllRequestsFilterContract = {
        ...contract,
        initiatorPhoneNumber: normalizePhoneNumber(
            contract.initiatorPhoneNumber?.trim()
        ),
        uniqId: contract.uniqId?.trim() || undefined,
        source: contract.source?.trim() || undefined,
    };
    validateAllRequestsFilter(resolved);
    return resolved;
}
