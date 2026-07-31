import { FinalizationDetailsTakeContract } from '../contracts/finalization-details-take.contract';

export function finalizationDetailsTakeVo(
    contract: FinalizationDetailsTakeContract
): FinalizationDetailsTakeContract {
    const uniqId = contract.uniqId?.trim();
    if (!uniqId) {
        throw new Error('FINALIZATION.DETAILS.TAKE.UNIQ_ID_REQUIRED');
    }
    return { uniqId };
}
