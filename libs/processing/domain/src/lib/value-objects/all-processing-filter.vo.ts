import { normalizePhoneNumber } from '@cmz/shared-domain';
import { AllProcessingFilterContract } from '../contracts/all-processing-filter.contract';
import { validateAllProcessingFilter } from '../validators/all-processing-filter.validator';

export function allProcessingFilterVo(
    contract: AllProcessingFilterContract
): AllProcessingFilterContract {
    const resolved: AllProcessingFilterContract = {
        ...contract,
        initiatorPhoneNumber: normalizePhoneNumber(
            contract.initiatorPhoneNumber?.trim()
        ),
        uniqId: contract.uniqId?.trim() || undefined,
        source: contract.source?.trim() || undefined,
    };
    validateAllProcessingFilter(resolved);
    return resolved;
}
