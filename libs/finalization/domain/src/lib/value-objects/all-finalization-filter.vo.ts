import { normalizePhoneNumber } from '@cmz/shared-domain';
import { AllFinalizationFilterContract } from '../contracts/all-finalization-filter.contract';
import { validateAllFinalizationFilter } from '../validators/all-finalization-filter.validator';

export function allFinalizationFilterVo(
    contract: AllFinalizationFilterContract
): AllFinalizationFilterContract {
    const resolved: AllFinalizationFilterContract = {
        ...contract,
        initiatorPhoneNumber: normalizePhoneNumber(
            contract.initiatorPhoneNumber?.trim()
        ),
        uniqId: contract.uniqId?.trim() || undefined,
        source: contract.source?.trim() || undefined,
    };
    validateAllFinalizationFilter(resolved);
    return resolved;
}
