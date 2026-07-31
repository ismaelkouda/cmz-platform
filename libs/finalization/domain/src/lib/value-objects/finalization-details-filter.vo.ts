import { FinalizationDetailsFilterContract } from '../contracts/finalization-details-filter.contract';

export function finalizationDetailsFilterVo(
    contract: FinalizationDetailsFilterContract
): FinalizationDetailsFilterContract {
    const uniqId = contract.uniqId?.trim();
    if (!uniqId) {
        throw new Error('FINALIZATION.DETAILS.FILTER.UNIQ_ID_REQUIRED');
    }
    return { uniqId };
}
