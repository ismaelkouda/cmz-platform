import { FinalizationDetailsFinalizeContract } from '../contracts/finalization-details-finalize.contract';

export function finalizationDetailsFinalizeVo(
    contract: FinalizationDetailsFinalizeContract
): FinalizationDetailsFinalizeContract {
    const uniqId = contract.uniqId?.trim();
    if (!uniqId) {
        throw new Error('FINALIZATION.DETAILS.FINALIZE.UNIQ_ID_REQUIRED');
    }
    const comment = contract.comment?.trim();
    if (!comment) {
        throw new Error('FINALIZATION.DETAILS.FINALIZE.COMMENT_REQUIRED');
    }
    return { uniqId, comment };
}
