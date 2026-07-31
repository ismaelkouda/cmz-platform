import { FinalizationDetailsFilterContract } from '../contracts/finalization-details-filter.contract';

export function finalizationDetailsFilterEntity(
    contract: FinalizationDetailsFilterContract
): FinalizationDetailsFilterContract {
    return { uniqId: contract.uniqId };
}
